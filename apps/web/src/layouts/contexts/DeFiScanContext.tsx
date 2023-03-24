import React, { createContext, useContext, useMemo } from "react";
import { EnvironmentNetwork } from "@waveshq/walletkit-core";
import { useNetworkEnvironmentContext } from "./NetworkEnvironmentContext";

interface DeFiScanContextI {
  getTransactionUrl: (txid: string, rawtx?: string) => string;
}

const DeFiScanContext = createContext<DeFiScanContextI>(undefined as any);
const baseDefiScanUrl = "https://defiscan.live";

function getNetworkParams(network: EnvironmentNetwork): string {
  switch (network) {
    case EnvironmentNetwork.MainNet:
      // no-op: network param not required for MainNet
      return "";
    case EnvironmentNetwork.TestNet:
      return `?network=${EnvironmentNetwork.TestNet}`;

    case EnvironmentNetwork.LocalPlayground:
    case EnvironmentNetwork.RemotePlayground:
      return `?network=${EnvironmentNetwork.RemotePlayground}`;
    default:
      return "";
  }
}

export function getTxURLByNetwork(
  network: EnvironmentNetwork,
  txid: string,
  rawtx?: string
): string {
  let baseUrl = `${baseDefiScanUrl}/transactions/${txid}`;

  baseUrl += getNetworkParams(network);

  if (typeof rawtx === "string" && rawtx.length !== 0) {
    if (network === EnvironmentNetwork.MainNet) {
      baseUrl += `?rawtx=${rawtx}`;
    } else {
      baseUrl += `&rawtx=${rawtx}`;
    }
  }

  return baseUrl;
}

export function getURLByNetwork(
  path: string,
  network: EnvironmentNetwork,
  id: number | string
): string {
  return `${baseDefiScanUrl}/${path}/${id}${getNetworkParams(network)}`;
}

export function useDeFiScanContext(): DeFiScanContextI {
  return useContext(DeFiScanContext);
}

export function DeFiScanProvider({
  children,
}: React.PropsWithChildren<any>): JSX.Element | null {
  const { networkEnv } = useNetworkEnvironmentContext();
  const context: DeFiScanContextI = useMemo(
    () => ({
      getTransactionUrl: (txid: string, rawtx?: string): string =>
        getTxURLByNetwork(networkEnv, txid, rawtx),
    }),
    [networkEnv]
  );

  return (
    <DeFiScanContext.Provider value={context}>
      {children}
    </DeFiScanContext.Provider>
  );
}
