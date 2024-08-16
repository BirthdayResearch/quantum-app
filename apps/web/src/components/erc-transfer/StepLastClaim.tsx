import BigNumber from "bignumber.js";
import clsx from "clsx";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { FiAlertCircle, FiCheck } from "react-icons/fi";
import {
  erc20ABI,
  useContractRead,
  useContractWrite,
  usePrepareContractWrite,
  useWaitForTransaction,
} from "wagmi";
import { parseEther, parseUnits } from "viem";
import { useRouter } from "next/router";
import { useContractContext } from "@contexts/ContractContext";
import { useStorageContext } from "@contexts/StorageContext";
import ActionButton from "@components/commons/ActionButton";
import Modal from "@components/commons/Modal";
import ErrorModal from "@components/commons/ErrorModal";
import { SignedClaim, TransferData } from "types";
import UtilityButton from "@components/commons/UtilityButton";
import useCheckBalance from "@hooks/useCheckBalance";
import useTransferFee from "@hooks/useTransferFee";
import useTimeCounter from "@hooks/useTimeCounter";
import Logging from "@api/logging";
import { getDuration } from "@utils/durationHelper";
import { ETHEREUM_SYMBOL, METAMASK_REJECT_MESSAGE } from "../../constants";

const CLAIM_INPUT_ERROR =
  "Check your connection and try again. If the error persists get in touch with us.";
const CLAIM_EXPIRED_ERROR =
  "Unfortunately, you are now unable to claim from this transaction. Closing this modal will reset the form for new transaction.";
const INSUFFICIENT_FUND_ERROR =
  "Quantum's servers are currently at capacity. We are unable to process transactions at this time, please try again in a few hours to claim your tokens.";

const ONE_HOUR = 60 * 60 * 1000; // ms

export default function StepLastClaim({
  data,
  signedClaim,
  onClose,
}: {
  data: TransferData;
  signedClaim: SignedClaim;
  onClose: () => void;
}) {
  const router = useRouter();
  const [showLoader, setShowLoader] = useState(false);
  const [error, setError] = useState<string>();

  const { BridgeV1, Erc20Tokens, ExplorerURL } = useContractContext();
  const tokenAddress = Erc20Tokens[data.to.tokenName].address;
  const { setStorage } = useStorageContext();

  const isTokenETH = data.to.tokenSymbol === ETHEREUM_SYMBOL;
  const { data: tokenDecimals, isFetched: isContractFetched } = useContractRead(
    {
      address: tokenAddress,
      abi: erc20ABI,
      functionName: "decimals",
      cacheOnBlock: true,
      enabled: !isTokenETH, // skip native ETH
    },
  );

  const [isClaimExpired, setIsClaimExpired] = useState(false);
  const { timeRemaining } = useTimeCounter(
    dayjs(new Date(signedClaim.deadline * 1000)).diff(dayjs()),
    () => setIsClaimExpired(true),
  );

  // Prepare write contract for `claimFund` function
  const [fee] = useTransferFee(data.to.amount.toString());
  const amountLessFee = BigNumber(
    BigNumber.max(data.to.amount.minus(fee), 0).toFixed(
      6,
      BigNumber.ROUND_DOWN,
    ),
  ).toNumber();
  const parsedAmount = isTokenETH
    ? parseEther(`${amountLessFee}`)
    : parseUnits(`${amountLessFee}`, tokenDecimals as number);

  const {
    config: bridgeConfig,
    refetch: refetchClaimConfig,
    isFetched: isTxnConfigFetched,
  } = usePrepareContractWrite({
    address: BridgeV1.address,
    abi: BridgeV1.abi,
    functionName: "claimFund",
    args: [
      data.to.address,
      parsedAmount,
      signedClaim.nonce,
      signedClaim.deadline,
      tokenAddress,
      signedClaim.signature,
    ],
    onError: (err) => Logging.error(err),
    enabled: isContractFetched || isTokenETH,
  });

  // Write contract for `claimFund` function
  const {
    data: claimFundData,
    error: writeClaimTxnError,
    write: writeClaimTxn,
  } = useContractWrite(bridgeConfig);

  // Wait and get result from write contract for `claimFund` function
  const {
    error: claimTxnError,
    isLoading: isClaimInProgress,
    isSuccess,
  } = useWaitForTransaction({
    hash: claimFundData?.hash,
    onSettled: () => setShowLoader(false),
  });

  const { getBalance } = useCheckBalance();

  useEffect(() => {
    if (isContractFetched) {
      // Fetch write txn config for the first time
      refetchClaimConfig();
    }
  }, [isContractFetched]);

  const handleOnClaim = async () => {
    setError(undefined);
    setShowLoader(true);

    const { isSuccess: isSuccessRefetch } = await refetchClaimConfig();
    if (isSuccessRefetch && writeClaimTxn) {
      writeClaimTxn();
      return;
    }

    /* Error handling starts here (Metamask won't open) */
    let errorMessage: string = CLAIM_INPUT_ERROR;
    // Check if claim is already expired
    if (isClaimExpired) {
      errorMessage = CLAIM_EXPIRED_ERROR;
    }
    // Check if Quantum funds is enough
    const balance = await getBalance(data.to.tokenSymbol);
    const isInsufficientFund = balance && data.to.amount.isGreaterThan(balance);
    if (isInsufficientFund) {
      errorMessage = INSUFFICIENT_FUND_ERROR;
    }
    setError(errorMessage);
  };

  const clearUnconfirmedTxn = () => {
    setStorage("txn-form", null);
    setStorage("dfc-address", null);
    setStorage("dfc-address-details", null);
  };

  useEffect(() => {
    if (isSuccess || isClaimExpired) {
      clearUnconfirmedTxn();
    }
  }, [isSuccess, isClaimExpired]);

  useEffect(() => {
    /* Handles displayed error AFTER Metamask confirmation */
    let err = writeClaimTxnError?.message ?? claimTxnError?.message;
    if (claimTxnError && claimTxnError.name && !claimTxnError.message) {
      // Txn Error can sometimes occur but have empty message
      if (isClaimExpired && claimFundData?.hash) {
        clearUnconfirmedTxn();
        err = CLAIM_EXPIRED_ERROR;
      } else {
        err = CLAIM_INPUT_ERROR;
      }
    }
    if (err?.includes(METAMASK_REJECT_MESSAGE)) {
      err = METAMASK_REJECT_MESSAGE;
    }
    setError(err);
  }, [writeClaimTxnError, claimTxnError]);

  const modalStatusMessage = {
    title: isClaimInProgress ? "Processing" : "Waiting for confirmation",
    message: isClaimInProgress
      ? "Do not close or refresh the browser while processing. This will only take a few seconds."
      : "Confirm this transaction in your Wallet.",
  };

  const claimDurationLeft = getDuration(
    timeRemaining.dividedBy(1000).toNumber(),
    { hrs: "hrs" },
  );

  const StatusMessage = {
    READY: {
      title: "Ready for claiming",
      message:
        "Your transaction has been verified and is now ready to be transferred to destination chain (ERC-20). You will be redirected to your wallet to claim your tokens.",
      btnLabel: "Claim tokens",
      btnAction: () => handleOnClaim(),
    },
    EXPIRED: {
      title: "Claim period has expired",
      message:
        "Unfortunately you are now unable to claim any tokens from this transaction. Closing this modal will reset the form and allow you to start a new transaction.",
      btnLabel: "Close",
      btnAction: () => onClose(),
    },
  };
  const claimStatus = isClaimExpired ? "EXPIRED" : "READY";

  return (
    <>
      {showLoader && (
        <Modal isOpen={showLoader}>
          <div className="flex flex-col items-center mt-6 mb-14">
            <div className="w-24 h-24 border border-brand-200 border-b-transparent rounded-full animate-spin" />
            <span className="font-bold text-2xl text-dark-900 mt-12">
              {modalStatusMessage.title}
            </span>
            <span className="text-dark-900 text-center mt-2">
              {modalStatusMessage.message}
            </span>
          </div>
        </Modal>
      )}
      {isSuccess && (
        <Modal isOpen={isSuccess} onClose={() => router.reload()}>
          <div className="flex flex-col items-center mt-6 mb-14">
            <FiCheck className="text-8xl text-valid ml-1" />
            <span className="font-bold text-2xl text-dark-900 mt-8">
              Token claimed
            </span>
            <span className="text-dark-900 mt-2">
              {`You have successfully claimed your ${data.to.tokenName} tokens.`}
            </span>
            <div className="mt-14">
              <UtilityButton
                label="View on Etherscan"
                onClick={() =>
                  window.open(
                    `${ExplorerURL}/tx/${claimFundData?.hash}`,
                    "_blank",
                  )
                }
              />
            </div>
          </div>
        </Modal>
      )}
      {error && (
        <ErrorModal
          title="Claim Error"
          message={error}
          primaryButtonLabel={
            claimFundData?.hash ? "View on Etherscan" : "Try again"
          }
          onPrimaryButtonClick={() =>
            claimFundData?.hash
              ? window.open(`${ExplorerURL}/tx/${claimFundData.hash}`, "_blank")
              : handleOnClaim()
          }
          onClose={onClose}
        />
      )}
      <div className={clsx("pt-4 px-6", "md:px-[73px] md:pt-4 md:pb-6")}>
        {claimStatus === "EXPIRED" && (
          <div className="flex flex-col items-center mb-6 md:mb-4">
            <FiAlertCircle size={64} className="text-error" />
          </div>
        )}
        <span className="font-bold block text-center text-dark-900 tracking-[0.01em] md:tracking-wider text-lg">
          {StatusMessage[claimStatus].title}
        </span>
        <span className="block text-center text-sm text-dark-900 antialiased mt-1 pb-6">
          {StatusMessage[claimStatus].message}
        </span>
        <ActionButton
          label={StatusMessage[claimStatus].btnLabel}
          onClick={StatusMessage[claimStatus].btnAction}
          disabled={!isTxnConfigFetched}
        />
        {claimStatus === "READY" && (
          <div
            className={clsx(
              "text-sm text-center lowercase mt-2",
              timeRemaining.lt(ONE_HOUR) ? "text-error" : "text-warning",
            )}
          >
            <span className="font-semibold">{claimDurationLeft}</span>
            <span className="antialiased">
              {claimDurationLeft ? " until expiry" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}
