import Logging from "@api/logging";
import { useNetworkContext } from "@contexts/NetworkContext";
import { useBalanceDfcMutation, useBalanceEvmMutation } from "@store/index";
import { Network } from "types";

export default function useCheckBalance() {
  const [balanceEvm] = useBalanceEvmMutation();
  const [balanceDfc] = useBalanceDfcMutation();

  const { selectedNetworkA } = useNetworkContext();
  /**
   * When sending from EVM -> DFC, check that DFC wallet has enough balance;
   * When sending from DFC -> EVM, check that EVM wallet has enough balance;
   */
  async function getBalance(tokenSymbol: string): Promise<string | null> {
    try {
      const balance =
        selectedNetworkA.name === Network.Ethereum
          ? await balanceDfc({ tokenSymbol }).unwrap()
          : await balanceEvm({ tokenSymbol }).unwrap();
      return balance;
    } catch (err) {
      Logging.error(err);
      return null;
    }
  }
  return { getBalance };
}
