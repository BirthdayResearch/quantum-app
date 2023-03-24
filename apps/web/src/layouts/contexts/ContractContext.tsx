import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  PropsWithChildren,
} from "react";
import { ContractContextI } from "types";
import { EnvironmentNetwork } from "@waveshq/walletkit-core";
import { useNetworkEnvironmentContext } from "./NetworkEnvironmentContext";
import { MAINNET_CONFIG, TESTNET_CONFIG } from "../../config";

const ContractContext = createContext<ContractContextI>(undefined as any);

export function useContractContext(): ContractContextI {
  return useContext(ContractContext);
}

export function ContractProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | null {
  const { networkEnv } = useNetworkEnvironmentContext();
  const [config, setConfig] = useState(MAINNET_CONFIG);

  useEffect(() => {
    const contractConfig =
      networkEnv === EnvironmentNetwork.MainNet
        ? MAINNET_CONFIG
        : TESTNET_CONFIG;
    setConfig(contractConfig);
  }, [networkEnv]);

  return (
    <ContractContext.Provider value={config}>
      {children}
    </ContractContext.Provider>
  );
}
