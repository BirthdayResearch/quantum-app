import BigNumber from "bignumber.js";
import { FiArrowUpRight } from "react-icons/fi";
import { RiLoader2Line } from "react-icons/ri";
import { IoCheckmarkCircle } from "react-icons/io5";
import { useEffect, useState } from "react";
import clsx from "clsx";

import { useAllocateDfcFundMutation } from "@store/index";
import { HttpStatusCode } from "axios";
import useTimeout from "@hooks/useSetTimeout";
import { useStorageContext } from "@contexts/StorageContext";
import { useDeFiScanContext } from "@contexts/DeFiScanContext";
import { FormOptions } from "@contexts/NetworkContext";
import {
  CONFIRMATIONS_BLOCK_TOTAL,
  DFC_CONFIRMATIONS_BLOCK_TOTAL,
  EVM_CONFIRMATIONS_BLOCK_TOTAL,
} from "../constants";
import ConfirmationProgress from "./TransactionConfirmationProgressBar";
import useResponsive from "../hooks/useResponsive";
import { useContractContext } from "../layouts/contexts/ContractContext";
import ActionButton from "./commons/ActionButton";

export default function TransactionStatus({
  isConfirmed,
  isApiSuccess,
  isReverted,
  isUnsentFund,
  ethTxnStatusIsConfirmed,
  dfcTxnStatusIsConfirmed,
  numberOfEvmConfirmations,
  numberOfDfcConfirmations,
  allocationTxnHash,
  txnHash,
}: {
  isConfirmed: boolean;
  isApiSuccess: boolean;
  isReverted: boolean;
  isUnsentFund: boolean;
  ethTxnStatusIsConfirmed: boolean;
  dfcTxnStatusIsConfirmed: boolean;
  numberOfEvmConfirmations: string;
  numberOfDfcConfirmations: string;
  allocationTxnHash?: string;
  txnHash: string | undefined;
}) {
  const { ExplorerURL } = useContractContext();
  const { isLg, isMd, is2xl } = useResponsive();

  const [allocateDfcFund] = useAllocateDfcFundMutation();
  const { setStorage } = useStorageContext();
  const { getTransactionUrl } = useDeFiScanContext();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isThrottleLimitReached, setIsThrottleLimitReached] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  const confirmationBlocksCurrent = BigNumber.min(
    CONFIRMATIONS_BLOCK_TOTAL,
    new BigNumber(numberOfEvmConfirmations).plus(numberOfDfcConfirmations),
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
      setDescription("Expect to receive your tokens in your wallet shortly.");
    } else {
      setTitle("Awaiting confirmation");
      setDescription(
        "Processing transactions on both Ethereum and DeFiChain. Once confirmed, each corresponding transaction will be posted.",
      );
    }
  }, [isConfirmed, isReverted, isUnsentFund]);

  const handleRetrySend = async () => {
    if (txnHash !== undefined) {
      try {
        setIsRetrying(true);
        const fundData = await allocateDfcFund({
          txnHash,
        }).unwrap();

        if (fundData?.transactionHash !== undefined) {
          setStorage("allocationTxnHash", fundData?.transactionHash);
          setStorage("confirmed", txnHash);
          setStorage("unsent-fund", null);
        }
      } catch ({ data }) {
        if (data?.statusCode === HttpStatusCode.TooManyRequests) {
          setIsThrottleLimitReached(true);
          throttledTimeOut();
          setDescription(
            "Retry limit has been reached, please wait for a minute and try again",
          );
        } else if (data?.error?.includes("Fund already allocated")) {
          setStorage("confirmed", txnHash);
          setStorage("unsent-fund", null);
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
            confirmationBlocksTotal={CONFIRMATIONS_BLOCK_TOTAL}
            confirmationBlocksCurrent={confirmationBlocksCurrent}
            isConfirmed={isConfirmed}
            isApiSuccess={isApiSuccess}
            txnType="confirmations"
            activeTab={FormOptions.INSTANT}
          />
        </div>
      )}

      <div
        className={clsx("flex flex-col lg:flex-row", {
          "items-center": !isUnsentFund,
        })}
      >
        <div className="flex-1 flex-col w-full">
          <div className="leading-5 lg:text-xl font-semibold">{title}</div>
          <div className="pt-1 text-sm text-dark-700">{description}</div>
          <div
            className={clsx("flex mt-6 text-xs lg:text-base lg:leading-5", {
              "lg:mt-11": isConfirmed,
            })}
          >
            <div className="flex whitespace-nowrap items-center">
              {ethTxnStatusIsConfirmed || allocationTxnHash || isConfirmed ? (
                <IoCheckmarkCircle
                  size={16}
                  className={clsx("inline-block ml-1 mr-1.5", {
                    "text-valid": ethTxnStatusIsConfirmed || isConfirmed,
                    "text-dark-300": !(ethTxnStatusIsConfirmed || isConfirmed),
                  })}
                />
              ) : (
                <RiLoader2Line
                  size={16}
                  className="inline-block animate-spin mr-1"
                />
              )}
              {(!ethTxnStatusIsConfirmed && !allocationTxnHash) ||
              !isConfirmed ? (
                `Ethereum (${numberOfEvmConfirmations}/${EVM_CONFIRMATIONS_BLOCK_TOTAL})`
              ) : (
                <a
                  className={clsx(
                    "flex flex-row items-center hover:opacity-70",
                    { "font-semibold": isConfirmed },
                  )}
                  href={`${ExplorerURL}/tx/${txnHash}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {is2xl ? (
                    allocationTxnHash && (
                      <div className="flex">
                        View Etherscan
                        <FiArrowUpRight size={20} className="ml-1" />
                      </div>
                    )
                  ) : (
                    <div className="flex">
                      <span className="flex items-center">Etherscan</span>
                      <FiArrowUpRight size={20} className="ml-1" />
                    </div>
                  )}
                </a>
              )}
            </div>
            <span className="text-dark-300 mx-2">•</span>
            <div className="flex whitespace-nowrap items-center">
              {!ethTxnStatusIsConfirmed || isConfirmed || allocationTxnHash ? (
                <IoCheckmarkCircle
                  size={16}
                  className={clsx("inline-block ml-1 mr-1.5", {
                    "text-valid": ethTxnStatusIsConfirmed || isConfirmed,
                    "text-dark-300": !(ethTxnStatusIsConfirmed || isConfirmed),
                  })}
                />
              ) : (
                <RiLoader2Line
                  size={16}
                  className="inline-block animate-spin mr-1"
                />
              )}

              {!dfcTxnStatusIsConfirmed || isConfirmed
                ? `DeFiChain (${numberOfDfcConfirmations}/${DFC_CONFIRMATIONS_BLOCK_TOTAL})`
                : allocationTxnHash && (
                    <a
                      className={clsx(
                        "flex flex-row items-center hover:opacity-70",
                        { "font-semibold": isConfirmed },
                      )}
                      href={getTransactionUrl(allocationTxnHash)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {is2xl ? (
                        <div className="flex">
                          View DeFiScan
                          <FiArrowUpRight size={20} className="ml-1" />
                        </div>
                      ) : (
                        <div className="flex">
                          <span className="flex items-center">DeFiScan</span>
                          <FiArrowUpRight size={20} className="ml-1" />
                        </div>
                      )}
                    </a>
                  )}
            </div>
          </div>
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
              confirmationBlocksTotal={CONFIRMATIONS_BLOCK_TOTAL}
              confirmationBlocksCurrent={confirmationBlocksCurrent}
              isConfirmed={isConfirmed}
              isApiSuccess={isApiSuccess}
              txnType={
                ethTxnStatusIsConfirmed || isConfirmed
                  ? "DeFiChain"
                  : "Ethereum"
              }
              activeTab={FormOptions.INSTANT}
            />
          </div>
        )}
      </div>
    </div>
  );
}
