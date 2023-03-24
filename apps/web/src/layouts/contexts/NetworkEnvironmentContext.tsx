import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  PropsWithChildren,
} from "react";
import { useRouter } from "next/router";
import { useNetwork } from "wagmi";
import { EnvironmentNetwork, getEnvironment } from "@waveshq/walletkit-core";
import { ETHEREUM_MAINNET_ID } from "../../constants";

interface NetworkContextI {
  networkEnv: EnvironmentNetwork;
  updateNetworkEnv: (networkEnv: EnvironmentNetwork) => void;
  resetNetworkEnv: () => void;
}

const NetworkEnvironmentContext = createContext<NetworkContextI>(
  undefined as any
);

export function useNetworkEnvironmentContext(): NetworkContextI {
  return useContext(NetworkEnvironmentContext);
}

export function NetworkEnvironmentProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | null {
  const router = useRouter();
  const env = getEnvironment(process.env.NODE_ENV);
  const networkQuery = router.query.network;

  const { chain } = useNetwork();
  const isEthereumMainNet = chain?.id === ETHEREUM_MAINNET_ID;

  function getNetwork(n: EnvironmentNetwork): EnvironmentNetwork {
    if (!isEthereumMainNet && env.networks.includes(n)) {
      return n;
    }
    return isEthereumMainNet
      ? EnvironmentNetwork.MainNet
      : EnvironmentNetwork.TestNet;
  }

  const initialNetwork = getNetwork(networkQuery as EnvironmentNetwork);
  const [networkEnv, setNetworkEnv] =
    useState<EnvironmentNetwork>(initialNetwork);

  const handleNetworkEnvChange = (value: EnvironmentNetwork) => {
    if (isEthereumMainNet) {
      // Network environment should never be updated
      return;
    }
    setNetworkEnv(value);
    if (value !== initialNetwork) {
      router.replace(
        {
          pathname: "/",
          query: { network: value },
        },
        undefined,
        { shallow: true }
      );
    }
  };

  const resetNetworkEnv = () => {
    handleNetworkEnvChange(initialNetwork);
  };

  useEffect(() => {
    setNetworkEnv(initialNetwork);
  }, [initialNetwork]);

  const context: NetworkContextI = useMemo(
    () => ({
      networkEnv,
      updateNetworkEnv: handleNetworkEnvChange,
      resetNetworkEnv,
    }),
    [networkEnv]
  );

  return (
    <NetworkEnvironmentContext.Provider value={context}>
      {children}
    </NetworkEnvironmentContext.Provider>
  );
}
