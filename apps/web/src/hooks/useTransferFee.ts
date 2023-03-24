import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { useNetworkContext } from "@contexts/NetworkContext";
import { useLazyBridgeSettingsQuery } from "@store/index";
import { Network } from "types";

/**
 * Computes transfer fee
 * Any changes to the fee logic can be updated here
 */
export default function useTransferFee(transferAmount: string | number) {
  const { selectedNetworkA, selectedTokensA } = useNetworkContext();

  const [trigger] = useLazyBridgeSettingsQuery();
  const [dfcFee, setDfcFee] = useState<`${number}` | number>(0);
  const [evmFee, setEvmFee] = useState<`${number}` | number>(0);

  useEffect(() => {
    async function getBridgeSettings() {
      const { data } = await trigger({});
      if (data?.defichain.transferFee) setDfcFee(data?.defichain.transferFee);
      if (data?.ethereum.transferFee) setEvmFee(data?.ethereum.transferFee);
    }
    getBridgeSettings();
  }, [selectedTokensA]);

  const isSendingFromEvm = selectedNetworkA.name === Network.Ethereum;
  const feeSymbol = selectedTokensA.tokenA.name;
  const fee = new BigNumber(transferAmount || 0).multipliedBy(
    isSendingFromEvm ? evmFee : dfcFee
  );

  return [fee, feeSymbol];
}
