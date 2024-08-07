import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import clsx from "clsx";

import { useVerifyEthQueueTxnMutation } from "@store/index";
import { HttpStatusCode } from "axios";
import useTimeout from "@hooks/useSetTimeout";
import { useQueueStorageContext } from "@contexts/QueueStorageContext";
import { FormOptions } from "@contexts/NetworkContext";
import { EVM_CONFIRMATIONS_BLOCK_TOTAL } from "../constants";
import ConfirmationProgress from "./TransactionConfirmationProgressBar";
import useResponsive from "../hooks/useResponsive";
import ActionButton from "./commons/ActionButton";
import QueueTransactionModal from "./erc-transfer/QueueTransactionModal";

export default function QueueTransactionStatus({
  isConfirmed,
  isApiSuccess,
  isReverted,
  isUnsentFund,
  numberOfEvmConfirmations,
  txnHash,
  destinationAddress,
  amount,
  symbolToReceive,
}: {
  isConfirmed: boolean;
  isApiSuccess: boolean;
  isReverted: boolean;
  isUnsentFund: boolean;
  numberOfEvmConfirmations: string;
  txnHash?: string;
  destinationAddress?: string;
  amount?: string;
  symbolToReceive?: string;
}) {
  const { isLg, isMd } = useResponsive();

  const [verifyEthQueueTxn] = useVerifyEthQueueTxnMutation();
  const { setStorage } = useQueueStorageContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isThrottleLimitReached, setIsThrottleLimitReached] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [modalToDisplay, setModalToDisplay] = useState<boolean>(false);

  const confirmationBlocksCurrent = BigNumber.min(
    EVM_CONFIRMATIONS_BLOCK_TOTAL,
    new BigNumber(numberOfEvmConfirmations),
  ).toFixed();

  const [throttledTimeOut] = useTimeout(() => {
    setIsThrottleLimitReached(false);
  }, 60000);
  useEffect(() => {
    if (isUnsentFund) {
      setTitle("Transaction failed");
      setDescription(
        "We encountered an error while processing your transaction. Please try again after a few minutes.",
      );
    } else if (isReverted) {
      setTitle("Transaction is reverted");
      setDescription(
        "Something went wrong as the transaction was being processed. Please wait for the required confirmations to proceed with your transaction.",
      );
    } else if (isConfirmed) {
      setTitle("Transaction confirmed");
      setDescription("Transaction successfully added to queue.");
    } else {
      setTitle("Awaiting confirmation");
      setDescription(
        "Please wait as we are processing your transaction. Once completed, it will be added to Queue.",
      );
    }
  }, [isConfirmed, isReverted, isUnsentFund]);

  const handleRetrySend = async () => {
    if (txnHash !== undefined) {
      try {
        setIsRetrying(true);

        const confirmEthTxnData = await verifyEthQueueTxn({
          txnHash,
        }).unwrap();
        if (confirmEthTxnData?.isConfirmed) {
          setStorage("confirmed-queue", txnHash ?? null);
          setStorage("unconfirmed-queue", null);
          setStorage("txn-form-queue", null);
        }
      } catch ({ data }) {
        if (data?.statusCode === HttpStatusCode.TooManyRequests) {
          setIsThrottleLimitReached(true);
          throttledTimeOut();
          setDescription(
            "Retry limit has been reached, please wait for a minute and try again",
          );
        } else if (data?.error?.includes("Fund already allocated")) {
          setStorage("confirmed-queue", txnHash);
          setStorage("unsent-fund-queue", null);
        }
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <div
      className={clsx(
        "text-dark-1000 border-b border-b-dark-200 mb-[34px] lg:mb-[44px] lg:pb-[34px]",
        {
          "border-warning": isReverted,
          "border-error": isUnsentFund,
          "border-dark-card-stroke": isConfirmed,
          "pb-6": isMd,
          "pt-2 pb-6": !isMd,
        },
      )}
    >
      {!isLg && !isUnsentFund && (
        <div className="pb-6">
          <ConfirmationProgress
            confirmationBlocksTotal={EVM_CONFIRMATIONS_BLOCK_TOTAL}
            confirmationBlocksCurrent={confirmationBlocksCurrent}
            isConfirmed={isConfirmed}
            isApiSuccess={isApiSuccess}
            txnType="confirmations"
            activeTab={FormOptions.QUEUE}
          />
        </div>
      )}

      <div
        className={clsx("flex flex-col lg:flex-row", {
          "items-center": !isUnsentFund,
        })}
      >
        <div className="flex-1 flex-col w-full">
          <div className="leading-5 lg:text-xl tracking-normal lg:tracking-[0.01em] font-semibold">
            {title}
          </div>
          <div className="pt-1 text-sm text-dark-700">{description}</div>
          {isConfirmed && (
            <ActionButton
              label="View details"
              variant="primary"
              customStyle="mt-6 font-semibold lg:mt-4 text-dark-100 whitespace-nowrap w-full lg:w-fit lg:!px-5 !py-2.5 lg:self-center text-sm"
              onClick={() => setModalToDisplay(true)}
            />
          )}
        </div>
        {isUnsentFund && (
          <ActionButton
            label="Try again"
            variant="primary"
            customStyle="mt-6 lg:mt-0 text-dark-100 whitespace-nowrap w-full lg:w-fit xl:px-5 xl:py-2.5 lg:h-[40px] lg:self-center lg:text-xs"
            onClick={handleRetrySend}
            disabled={isThrottleLimitReached || isRetrying}
            isRefresh={!isRetrying}
            isLoading={isRetrying}
          />
        )}
        {isLg && !isUnsentFund && (
          <div className="flex flex-row pl-8">
            <ConfirmationProgress
              confirmationBlocksTotal={EVM_CONFIRMATIONS_BLOCK_TOTAL}
              confirmationBlocksCurrent={confirmationBlocksCurrent}
              isConfirmed={isConfirmed}
              isApiSuccess={isApiSuccess}
              txnType="Ethereum"
              activeTab={FormOptions.QUEUE}
            />
          </div>
        )}
        {txnHash && (
          <QueueTransactionModal
            isOpen={modalToDisplay}
            title="Transaction in queue"
            message="Track your transaction via the status icon (top-right corner) using your transaction hash."
            buttonLabel="View on Etherscan"
            transactionHash={txnHash}
            destinationAddress={destinationAddress}
            amount={amount}
            symbol={symbolToReceive}
            onClose={() => setModalToDisplay(false)}
          />
        )}
      </div>
    </div>
  );
}
