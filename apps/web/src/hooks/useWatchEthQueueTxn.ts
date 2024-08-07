import { useQueueStorageContext } from "@contexts/QueueStorageContext";
import { useVerifyEthQueueTxnMutation } from "@store/index";
import { HttpStatusCode } from "axios";
import { useEffect, useState } from "react";

/**
 * This polls in the /ethereum/queue/verify to verify if txn is confirmed (>= 65 confirmations)
 */
export default function useWatchEthQueueTxn() {
  const { txnHash, setStorage, createdQueueTxnHash } = useQueueStorageContext();

  const [verifyEthQueueTxn] = useVerifyEthQueueTxnMutation();

  const [isQueueApiSuccess, setIsQueueApiSuccess] = useState(false);
  const [ethQueueTxnStatus, setEthQueueTxnStatus] = useState<{
    isConfirmed: boolean;
    numberOfConfirmations: string;
  }>({ isConfirmed: false, numberOfConfirmations: "0" });

  let pollInterval;

  /* Poll to check if the txn is already confirmed */
  useEffect(() => {
    setIsQueueApiSuccess(false);
    const pollConfirmEthTxn = async function poll(unconfirmed?: string) {
      try {
        if (unconfirmed === undefined) {
          return;
        }

        const confirmEthTxnData = await verifyEthQueueTxn({
          txnHash: unconfirmed,
        }).unwrap();

        setEthQueueTxnStatus({
          isConfirmed: confirmEthTxnData?.isConfirmed,
          numberOfConfirmations: confirmEthTxnData?.numberOfConfirmations,
        });

        if (confirmEthTxnData?.isConfirmed) {
          setIsQueueApiSuccess(true);
          setStorage("confirmed-queue", unconfirmed ?? null);
          setStorage("unconfirmed-queue", null);
          setStorage("txn-form-queue", null);
        }

        setIsQueueApiSuccess(true);
      } catch ({ data }) {
        if (data?.error?.includes("Fund already allocated")) {
          setStorage("confirmed-queue", unconfirmed ?? null);
          setStorage("unconfirmed-queue", null);
          setStorage("txn-form-queue", null);
        } else if (
          data?.error?.includes("There is a problem in allocating fund")
        ) {
          setStorage("unsent-fund-queue", unconfirmed ?? null);
          setStorage("unconfirmed-queue", null);
        } else if (
          data?.statusCode === HttpStatusCode.BadRequest &&
          data?.message === "Transaction Reverted"
        ) {
          setStorage("reverted-queue", unconfirmed ?? null);
          setStorage("unconfirmed-queue", null);
        } else if (data?.statusCode === HttpStatusCode.TooManyRequests) {
          //   handle throttle error;
        }
      }
    };

    if (pollInterval !== undefined) {
      clearInterval(pollInterval);
    }

    // Run on load
    if (!isQueueApiSuccess) {
      setEthQueueTxnStatus({
        isConfirmed: false,
        numberOfConfirmations: "0",
      });

      if (createdQueueTxnHash !== undefined) {
        pollConfirmEthTxn(txnHash.unconfirmed);
      }
    }

    pollInterval = setInterval(() => {
      if (createdQueueTxnHash !== undefined) {
        pollConfirmEthTxn(txnHash.unconfirmed);
      }
    }, 20000);

    return () => {
      if (pollInterval !== undefined) {
        clearInterval(pollInterval);
      }
    };
  }, [createdQueueTxnHash]);

  return { ethQueueTxnStatus, isQueueApiSuccess };
}
