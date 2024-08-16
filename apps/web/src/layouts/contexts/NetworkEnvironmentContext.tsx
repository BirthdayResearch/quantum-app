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
import { useNetworkContext as useWhaleNetworkContext } from "@waveshq/walletkit-ui";
import { EnvironmentNetwork, getEnvironment } from "@waveshq/walletkit-core";
import { ETHEREUM_MAINNET_ID } from "../../constants";

interface NetworkContextI {
  networkEnv: EnvironmentNetwork;
  updateNetworkEnv: (networkEnv: EnvironmentNetwork) => void;
  resetNetworkEnv: () => void;
}

const NetworkEnvironmentContext = createContext<NetworkContextI>(
  undefined as any,
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
  const defaultNetwork = EnvironmentNetwork.MainNet;
  const { updateNetwork: updateWhaleNetwork } = useWhaleNetworkContext();
  const { chain } = useNetwork();
  const isEthereumMainNet = chain?.id === ETHEREUM_MAINNET_ID;

  function getInitialNetwork(n: EnvironmentNetwork): EnvironmentNetwork {
    if (chain === undefined || process.env.NODE_ENV === "development") {
      return env.networks.includes(n) ? n : defaultNetwork;
    }

    return isEthereumMainNet
      ? EnvironmentNetwork.MainNet
      : EnvironmentNetwork.TestNet;
  }

  const initialNetwork = getInitialNetwork(networkQuery as EnvironmentNetwork);
  const [networkEnv, setNetworkEnv] =
    useState<EnvironmentNetwork>(initialNetwork);

  const updateRoute = (value: EnvironmentNetwork) => {
    router.replace(
      {
        pathname: router.pathname,
        query: value === defaultNetwork ? {} : { network: value },
      },
      undefined,
      { shallow: true },
    );
  };

  const handleNetworkEnvChange = (value: EnvironmentNetwork) => {
    setNetworkEnv(value);
    updateRoute(value);
    updateWhaleNetwork(value);
  };

  const resetNetworkEnv = () => {
    handleNetworkEnvChange(initialNetwork);
  };

  useEffect(() => {
    setNetworkEnv(initialNetwork);
    updateRoute(initialNetwork);
    updateWhaleNetwork(initialNetwork);
  }, [initialNetwork]);

  const context: NetworkContextI = useMemo(
    () => ({
      networkEnv,
      updateNetworkEnv: handleNetworkEnvChange,
      resetNetworkEnv,
    }),
    [networkEnv, router],
  );

  return (
    <NetworkEnvironmentContext.Provider value={context}>
      {children}
    </NetworkEnvironmentContext.Provider>
  );
}
