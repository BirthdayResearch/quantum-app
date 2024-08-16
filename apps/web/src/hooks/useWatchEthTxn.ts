import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import { useStorageContext } from "@contexts/StorageContext";
import {
  useAllocateDfcFundMutation,
  useConfirmEthTxnMutation,
} from "@store/index";
import { HttpStatusCode } from "axios";
import { useEffect, useState } from "react";

/**
 * This polls in the /handle-transaction to verify if txn is confirmed (>= 65 confirmations)
 */
export default function useWatchEthTxn() {
  const { networkEnv } = useNetworkEnvironmentContext();
  const { txnHash, setStorage } = useStorageContext();

  const [confirmEthTxn] = useConfirmEthTxnMutation();
  const [allocateDfcFund] = useAllocateDfcFundMutation();

  const [isApiSuccess, setIsApiSuccess] = useState(false);
  const [ethTxnStatus, setEthTxnStatus] = useState<{
    isConfirmed: boolean;
    numberOfConfirmations: string;
  }>({ isConfirmed: false, numberOfConfirmations: "0" });

  const [dfcTxnStatus, setDfcTxnStatus] = useState<{
    isConfirmed: boolean;
    numberOfConfirmations: string;
  }>({
    isConfirmed: false,
    numberOfConfirmations: "0",
  });

  let pollInterval;

  /* Poll to check if the txn is already confirmed */
  useEffect(() => {
    setIsApiSuccess(false);
    const pollConfirmEthTxn = async function poll(unconfirmed?: string) {
      try {
        if (unconfirmed === undefined) {
          return;
        }

        const confirmEthTxnData = await confirmEthTxn({
          txnHash: unconfirmed,
        }).unwrap();

        if (!confirmEthTxnData) {
          return;
        }

        setEthTxnStatus({
          isConfirmed: confirmEthTxnData?.isConfirmed,
          numberOfConfirmations: confirmEthTxnData?.numberOfConfirmations,
        });

        if (confirmEthTxnData?.isConfirmed) {
          const allocateDfcFundData = await allocateDfcFund({
            txnHash: unconfirmed,
          }).unwrap();
          setIsApiSuccess(true);
          setDfcTxnStatus({
            isConfirmed: allocateDfcFundData?.isConfirmed,
            numberOfConfirmations:
              allocateDfcFundData?.numberOfConfirmationsDfc.toString(),
          });

          /* Allocating DFC fund requires min number of DFC confirmations */
          if (
            allocateDfcFundData?.transactionHash !== undefined &&
            allocateDfcFundData?.isConfirmed !== true
          ) {
            return;
          }

          if (
            allocateDfcFundData?.transactionHash !== undefined &&
            allocateDfcFundData?.isConfirmed === true
          ) {
            setStorage(
              "allocationTxnHash",
              allocateDfcFundData?.transactionHash,
            );
            setStorage("confirmed", unconfirmed ?? null);
            setStorage("unconfirmed", null);
            setStorage("txn-form", null);
          }
        }

        setIsApiSuccess(true);
      } catch ({ data }) {
        if (data?.error?.includes("Fund already allocated")) {
          setStorage("confirmed", unconfirmed ?? null);
          setStorage("unconfirmed", null);
          setStorage("txn-form", null);
        } else if (
          data?.error?.includes("There is a problem in allocating fund")
        ) {
          setStorage("unsent-fund", unconfirmed ?? null);
          setStorage("unconfirmed", null);
        } else if (
          data?.statusCode === HttpStatusCode.BadRequest &&
          data?.message === "Transaction Reverted"
        ) {
          setStorage("reverted", unconfirmed ?? null);
          setStorage("unconfirmed", null);
        } else if (data?.statusCode === HttpStatusCode.TooManyRequests) {
          //   handle throttle error;
        }
      }
    };

    if (pollInterval !== undefined) {
      clearInterval(pollInterval);
    }

    // Run on load
    if (!isApiSuccess) {
      setDfcTxnStatus({
        isConfirmed: false,
        numberOfConfirmations: "0",
      });
      setEthTxnStatus({
        isConfirmed: false,
        numberOfConfirmations: "0",
      });

      pollConfirmEthTxn(txnHash.unconfirmed);
    }

    pollInterval = setInterval(() => {
      pollConfirmEthTxn(txnHash.unconfirmed);
    }, 20000);

    return () => {
      if (pollInterval !== undefined) {
        clearInterval(pollInterval);
      }
    };
  }, [networkEnv, txnHash]);

  return { ethTxnStatus, dfcTxnStatus, isApiSuccess };
}
