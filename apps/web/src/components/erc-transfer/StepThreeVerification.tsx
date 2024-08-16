import clsx from "clsx";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import UtilityButton from "@components/commons/UtilityButton";
import { useLazyVerifyQuery } from "@store/index";
import BigNumber from "bignumber.js";
import Logging from "@api/logging";
import { CustomErrorCodes, SignedClaim } from "types";
import { HttpStatusCode } from "axios";
import { useContractContext } from "@contexts/ContractContext";
import useTimeout from "@hooks/useSetTimeout";
import { useStorageContext } from "@contexts/StorageContext";
import { RiLoader2Line } from "react-icons/ri";
import DfcTransactionStatus from "../DfcTransactionStatus";
import useWatchDfcTxn from "../../hooks/useWatchDfcTxn";
import QrAddress from "../QrAddress";

enum ButtonLabel {
  Rejected = "Try again",
}

enum TitleLabel {
  Rejected = "Validation failed",
  ThrottleLimit = "Verification attempt limit reached",
}

type RejectedLabelType = `Something went wrong${string}`;

enum ContentLabel {
  ThrottleLimit = "Please wait for a minute and try again.",
}

function ValidationStatus({
  buttonLabel,
  validationSuccess,
  isValidating,
  isThrottled,
  onClick,
}: {
  buttonLabel: string;
  validationSuccess: boolean;
  isValidating: boolean;
  isThrottled: boolean;
  onClick: () => void;
}) {
  if (isThrottled) {
    return (
      <RiLoader2Line
        size={24}
        className={clsx("inline-block animate-spin text-brand-100")}
      />
    );
  }

  return (
    <div>
      <UtilityButton
        label={buttonLabel}
        isLoading={isValidating}
        disabled={isValidating || validationSuccess || isThrottled}
        withRefreshIcon={!validationSuccess && !isValidating}
        onClick={onClick}
        responsiveStyle="py-2 px-5 leading-4 text-xs md:text-sm"
      />
    </div>
  );
}

export default function StepThreeVerification({
  goToNextStep,
  onSuccess,
}: {
  goToNextStep: () => void;
  onSuccess: (claim: SignedClaim) => void;
}) {
  const { Erc20Tokens } = useContractContext();
  const [trigger] = useLazyVerifyQuery();
  const [title, setTitle] = useState<TitleLabel | RejectedLabelType>(
    TitleLabel.Rejected,
  );

  const [txnId, setTxnId] = useState<string | undefined>(undefined);
  const { dfcTxnStatus, isApiSuccess } = useWatchDfcTxn(txnId);

  const contentLabelRejected = (
    <span>
      <span>Please check our </span>
      <Link
        href="https://birthday-research.gitbook.io/quantum-documentation/troubleshooting/error-codes"
        target="_blank"
        rel="noopener noreferrer"
        className="underline"
      >
        Error guide
      </Link>
      <span> and try again</span>
    </span>
  );
  const [content, setContent] = useState<ContentLabel | JSX.Element>(
    contentLabelRejected,
  );
  const [buttonLabel, setButtonLabel] = useState<ButtonLabel>(
    ButtonLabel.Rejected,
  );

  const { txnForm: txn, dfcAddress } = useStorageContext();
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isThrottled, setIsThrottled] = useState(false);

  const [throttledTimeOut] = useTimeout(() => {
    setIsThrottled(false);
  }, 60000);

  const triggerVerify = useCallback(async () => {
    if (
      isValidating === true &&
      dfcAddress !== null &&
      dfcAddress !== undefined &&
      txn?.amount !== undefined &&
      txn?.selectedTokensA.tokenA.symbol !== undefined
    ) {
      try {
        const response = await trigger({
          address: dfcAddress,
          ethReceiverAddress: txn.toAddress,
          tokenAddress: Erc20Tokens[txn.selectedTokensB.tokenA.name].address,
          // ROUND_FLOOR is used to prevent the amount from being rounded up and exceeding the original amount
          amount: new BigNumber(txn.amount).toFixed(5, BigNumber.ROUND_FLOOR),
          symbol: txn.selectedTokensA.tokenA.symbol,
        }).unwrap();

        if (response.statusCode !== undefined) {
          Logging.info(`Returned statusCode: ${response.statusCode}`);
          if (
            response.statusCode ===
            CustomErrorCodes.IsBelowMinConfirmationRequired
          ) {
            // start polling and wait for 35 blocks confirmation
            setTxnId(response.txnId);
          } else {
            setContent(contentLabelRejected);
            setTitle(
              `Something went wrong (Error code ${response.statusCode})`,
            );
            setValidationSuccess(false);
            setIsValidating(false);
            setButtonLabel(ButtonLabel.Rejected);
          }
          return;
        }

        setValidationSuccess(true);
        onSuccess(response);
        goToNextStep();
      } catch (e) {
        setButtonLabel(ButtonLabel.Rejected);
        setIsValidating(false);
        setValidationSuccess(false);

        if (e.data?.statusCode === HttpStatusCode.TooManyRequests) {
          setTitle(TitleLabel.ThrottleLimit);
          setContent(ContentLabel.ThrottleLimit);
          setIsThrottled(true);
          throttledTimeOut();
        } else {
          setTitle(TitleLabel.Rejected);
          setContent(contentLabelRejected);
        }
        Logging.error(e);
      }
    }
  }, []);

  useEffect(() => {
    triggerVerify();
  }, [isValidating, validationSuccess]);

  useEffect(() => {
    if (dfcTxnStatus.isConfirmed) {
      triggerVerify();
    }
  }, [dfcTxnStatus.isConfirmed]);

  const onTryAgainClicked = () => {
    setIsValidating(true);
  };

  return (
    <div className={clsx("flex flex-col mt-6", "md:flex-row md:mt-4")}>
      {isValidating ? (
        <DfcTransactionStatus
          isConfirmed={dfcTxnStatus.isConfirmed}
          isApiSuccess={isApiSuccess}
          numOfConfirmations={dfcTxnStatus.numberOfConfirmations}
        />
      ) : (
        <div className={clsx("flex flex-col", "md:gap-6 md:flex-row")}>
          {dfcAddress && (
            <div
              className={clsx(
                "relative max-w-max mx-auto flex flex-row order-1 mt-6 justify-start border-[0.5px] border-dark-200 rounded",
                "md:w-2/5 md:flex-col md:shrink-0 md:order-none px-6 pt-6 pb-3 md:mt-0",
              )}
            >
              <QrAddress dfcUniqueAddress={dfcAddress}>
                <div
                  className={clsx(
                    "flex justify-left mt-3",
                    "md:justify-center",
                  )}
                >
                  <ValidationStatus
                    buttonLabel={buttonLabel}
                    validationSuccess={validationSuccess}
                    isValidating={isValidating}
                    isThrottled={isThrottled}
                    onClick={onTryAgainClicked}
                  />
                </div>
              </QrAddress>
            </div>
          )}
          <div
            className={clsx(
              "flex flex-col grow text-center",
              "md:text-left md:mt-4",
            )}
          >
            <span className="font-semibold text-dark-900 tracking-[0.01em] md:tracking-wider">
              {title}
            </span>
            <p className="text-sm text-dark-700 mt-2">{content}</p>
          </div>
        </div>
      )}
    </div>
  );
}
