import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import { useEffect, useState } from "react";
import { useWhaleApiClient } from "@waveshq/walletkit-ui/dist/contexts";
import { DFC_CONFIRMATIONS_BLOCK_TOTAL } from "../constants";
import Logging from "../api/logging";

export default function useWatchDfcTxn(txnId?: string) {
  const { networkEnv } = useNetworkEnvironmentContext();
  const client = useWhaleApiClient();

  const [shouldStopPolling, setStopPolling] = useState(false);
  const [isApiSuccess, setIsApiSuccess] = useState(false);
  const [dfcTxnStatus, setDfcTxnStatus] = useState<{
    isConfirmed: boolean;
    numberOfConfirmations: string;
  }>({
    isConfirmed: false,
    numberOfConfirmations: "0",
  });

  let pollInterval;

  function clearPollInterval() {
    if (pollInterval !== undefined) {
      clearInterval(pollInterval);
    }
  }

  /* Poll to check if the txn is already confirmed */
  useEffect(() => {
    setIsApiSuccess(false);
    const pollConfirmEthTxn = async function poll(
      transactionId?: string,
      stopPolling?: boolean,
    ) {
      try {
        if (
          transactionId === undefined ||
          stopPolling === undefined ||
          stopPolling
        ) {
          return;
        }
        const stats = await client.stats.get();
        const txnData = await client.transactions.get(transactionId);
        const numberOfConfirmations = stats.count.blocks - txnData.block.height;
        let isConfirmed = false;
        if (numberOfConfirmations >= DFC_CONFIRMATIONS_BLOCK_TOTAL) {
          isConfirmed = true;
        }
        setDfcTxnStatus({
          isConfirmed,
          numberOfConfirmations: numberOfConfirmations.toString(),
        });
        setIsApiSuccess(true);
        setStopPolling(isConfirmed);
      } catch (e) {
        Logging.error(e);
        setDfcTxnStatus({ isConfirmed: false, numberOfConfirmations: "0" });
      }
    };

    clearPollInterval();

    if (!shouldStopPolling) {
      // Run on load
      if (!isApiSuccess) {
        setDfcTxnStatus({
          isConfirmed: false,
          numberOfConfirmations: "0",
        });
        pollConfirmEthTxn(txnId, shouldStopPolling);
      }

      pollInterval = setInterval(() => {
        pollConfirmEthTxn(txnId, shouldStopPolling);
      }, 20000);
    }

    return () => {
      clearPollInterval();
    };
  }, [networkEnv, txnId, shouldStopPolling]);

  return { dfcTxnStatus, isApiSuccess };
}
