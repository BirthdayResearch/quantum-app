import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  PropsWithChildren,
  useEffect,
} from "react";
import {
  Erc20Token,
  Network,
  NetworkOptionsI,
  TokenDetailI,
  TokensI,
} from "types";

export interface NetworkContextI {
  selectedNetworkA: NetworkOptionsI;
  selectedTokensA: TokensI;
  selectedNetworkB: NetworkOptionsI;
  selectedTokensB: TokensI;
  setSelectedNetworkA: (networkA: NetworkOptionsI) => void;
  setSelectedTokensA: (tokenA: TokensI) => void;
  setSelectedNetworkB: (networkB: NetworkOptionsI) => void;
  setSelectedTokensB: (tokenB: TokensI) => void;
  selectedQueueNetworkA: NetworkOptionsI;
  selectedQueueTokensA: TokensI;
  selectedQueueNetworkB: NetworkOptionsI;
  typeOfTransaction: FormOptions;
  selectedQueueTokensB: TokensI;
  setSelectedQueueNetworkA: (networkA: NetworkOptionsI) => void;
  setSelectedQueueTokensA: (tokenA: TokensI) => void;
  setSelectedQueueNetworkB: (networkB: NetworkOptionsI) => void;
  setSelectedQueueTokensB: (tokenB: TokensI) => void;
  setTypeOfTransaction: (transactionType: FormOptions) => void;

  resetNetworkSelection: () => void;
}

export interface NetworkI<T> {
  name: Network;
  icon: string;
  tokens: {
    tokenA: TokenDetailI<T>;
    tokenB: TokenDetailI<string>;
  }[];
}

export const networks: [NetworkI<string>, NetworkI<Erc20Token>] = [
  {
    name: Network.DeFiChain,
    icon: "/tokens/DeFichain.svg",
    tokens: [
      // {
      //   tokenA: {
      //     name: "DFI",
      //     symbol: "DFI",
      //     icon: "/tokens/DFI.svg",
      //   },
      //   tokenB: {
      //     name: "DFI",
      //     subtitle: "(Ethereum)",
      //     symbol: "DFI",
      //     icon: "/tokens/DFI.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dBTC",
      //     symbol: "BTC",
      //     icon: "/tokens/dBTC.svg",
      //   },
      //   tokenB: {
      //     name: "WBTC",
      //     symbol: "WBTC",
      //     icon: "/tokens/wBTC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dETH",
      //     symbol: "ETH",
      //     icon: "/tokens/dETH.svg",
      //   },
      //   tokenB: {
      //     name: "ETH",
      //     symbol: "ETH",
      //     icon: "/tokens/ETH.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dUSDT",
      //     symbol: "USDT",
      //     icon: "/tokens/dUSDT.svg",
      //   },
      //   tokenB: {
      //     name: "USDT",
      //     symbol: "USDT",
      //     icon: "/tokens/USDT.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dUSDC",
      //     symbol: "USDC",
      //     icon: "/tokens/dUSDC.svg",
      //   },
      //   tokenB: {
      //     name: "USDC",
      //     symbol: "USDC",
      //     icon: "/tokens/USDC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dEUROC",
      //     symbol: "EUROC",
      //     icon: "/tokens/dEUROC.svg",
      //   },
      //   tokenB: {
      //     name: "EUROC",
      //     symbol: "EUROC",
      //     icon: "/tokens/EUROC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "dMATIC",
      //     symbol: "MATIC",
      //     icon: "/tokens/dMATIC.svg",
      //   },
      //   tokenB: {
      //     name: "MATIC",
      //     symbol: "MATIC",
      //     icon: "/tokens/MATIC.svg",
      //   },
      // },
      {
        tokenA: {
          name: "dXCHF",
          symbol: "XCHF",
          icon: "/tokens/dXCHF.svg",
        },
        tokenB: {
          name: "XCHF",
          symbol: "XCHF",
          icon: "/tokens/XCHF.svg",
        },
      },
      /* TODO: Uncomment once ready
      {
        tokenA: {
          name: "dSOL",
          symbol: "SOL",
          icon: "/tokens/dSOL.svg",
        },
        tokenB: {
          name: "SOL",
          symbol: "SOL",
          icon: "/tokens/SOL.svg",
        },
      },
      {
        tokenA: {
          name: "dDOT",
          symbol: "DOT",
          icon: "/tokens/dDOT.svg",
        },
        tokenB: {
          name: "BDOT",
          symbol: "BDOT",
          icon: "/tokens/bDOT.svg",
        },
      }, */
    ],
  },
  {
    name: Network.Ethereum,
    icon: "/tokens/Ethereum.svg",
    tokens: [
      // {
      //   tokenA: {
      //     name: "DFI",
      //     subtitle: "(Ethereum)",
      //     symbol: "DFI",
      //     icon: "/tokens/DFI.svg",
      //   },
      //   tokenB: {
      //     name: "DFI",
      //     symbol: "DFI",
      //     icon: "/tokens/DFI.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "WBTC",
      //     symbol: "WBTC",
      //     icon: "/tokens/wBTC.svg",
      //   },
      //   tokenB: {
      //     name: "dBTC",
      //     symbol: "BTC",
      //     icon: "/tokens/dBTC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "ETH",
      //     symbol: "ETH",
      //     icon: "/tokens/ETH.svg",
      //   },
      //   tokenB: {
      //     name: "dETH",
      //     symbol: "ETH",
      //     icon: "/tokens/dETH.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "USDT",
      //     symbol: "USDT",
      //     icon: "/tokens/USDT.svg",
      //   },
      //   tokenB: {
      //     name: "dUSDT",
      //     symbol: "USDT",
      //     icon: "/tokens/dUSDT.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "USDC",
      //     symbol: "USDC",
      //     icon: "/tokens/USDC.svg",
      //   },
      //   tokenB: {
      //     name: "dUSDC",
      //     symbol: "USDC",
      //     icon: "/tokens/dUSDC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "EUROC",
      //     symbol: "EUROC",
      //     icon: "/tokens/EUROC.svg",
      //   },
      //   tokenB: {
      //     name: "dEUROC",
      //     symbol: "EUROC",
      //     icon: "/tokens/dEUROC.svg",
      //   },
      // },
      // {
      //   tokenA: {
      //     name: "MATIC",
      //     symbol: "MATIC",
      //     icon: "/tokens/MATIC.svg",
      //   },
      //   tokenB: {
      //     name: "dMATIC",
      //     symbol: "MATIC",
      //     icon: "/tokens/dMATIC.svg",
      //   },
      // },
      {
        tokenA: {
          name: "XCHF",
          symbol: "XCHF",
          icon: "/tokens/XCHF.svg",
        },
        tokenB: {
          name: "dXCHF",
          symbol: "XCHF",
          icon: "/tokens/dXCHF.svg",
        },
      },
      /* TODO: Uncomment once ready
      {
        tokenA: {
          name: "SOL",
          symbol: "SOL",
          icon: "/tokens/SOL.svg",
        },
        tokenB: {
          name: "dSOL",
          symbol: "SOL",
          icon: "/tokens/dSOL.svg",
        },
      },
      {
        tokenA: {
          name: "BDOT",
          symbol: "BDOT",
          icon: "/tokens/bDOT.svg",
        },
        tokenB: {
          name: "dDOT",
          symbol: "DOT",
          icon: "/tokens/dDOT.svg",
        },
      }, */
    ],
  },
];

const NetworkContext = createContext<NetworkContextI>(undefined as any);

export function useNetworkContext(): NetworkContextI {
  return useContext(NetworkContext);
}

export enum FormOptions {
  INSTANT = "Instant",
  QUEUE = "Queue",
}

export function NetworkProvider({
  children,
}: PropsWithChildren<{}>): JSX.Element | null {
  const [typeOfTransaction, setTypeOfTransaction] = useState<FormOptions>(
    FormOptions.INSTANT,
  );

  const [defaultNetworkA, defaultNetworkB] = networks;
  const [selectedNetworkA, setSelectedNetworkA] =
    useState<NetworkOptionsI>(defaultNetworkA);
  const [selectedTokensA, setSelectedTokensA] = useState<TokensI>(
    defaultNetworkA.tokens[0],
  );
  const [selectedNetworkB, setSelectedNetworkB] =
    useState<NetworkOptionsI>(defaultNetworkB);
  const [selectedTokensB, setSelectedTokensB] = useState<TokensI>(
    defaultNetworkB.tokens[0],
  );

  // Queue
  const [defaultQueueNetworkA, defaultQueueNetworkB] = networks;
  const [selectedQueueNetworkA, setSelectedQueueNetworkA] =
    useState<NetworkOptionsI>(defaultQueueNetworkA);
  const [selectedQueueTokensA, setSelectedQueueTokensA] = useState<TokensI>(
    defaultQueueNetworkA.tokens[0],
  );
  const [selectedQueueNetworkB, setSelectedQueueNetworkB] =
    useState<NetworkOptionsI>(defaultQueueNetworkB);
  const [selectedQueueTokensB, setSelectedQueueTokensB] = useState<TokensI>(
    defaultQueueNetworkB.tokens[0],
  );

  // To get form config depending on the FormOption if its Instant or Queue
  function getFormConfigs() {
    let selectedFormNetworkA;
    let setFormSelectedNetworkB;
    let setFormSelectedTokensA;
    let selectedFormTokensB;

    let selectedFormNetworkB;
    let selectedFormTokensA;
    let setFormSelectedTokensB;

    if (typeOfTransaction === FormOptions.INSTANT) {
      selectedFormNetworkA = selectedNetworkA;
      setFormSelectedNetworkB = setSelectedNetworkB;
      setFormSelectedTokensA = setSelectedTokensA;
      selectedFormTokensB = selectedTokensB;

      selectedFormNetworkB = selectedNetworkB;
      selectedFormTokensA = selectedTokensA;
      setFormSelectedTokensB = setSelectedTokensB;
    } else {
      selectedFormNetworkA = selectedQueueNetworkA;
      setFormSelectedNetworkB = setSelectedQueueNetworkB;
      setFormSelectedTokensA = setSelectedQueueTokensA;
      selectedFormTokensB = selectedQueueTokensB;

      selectedFormNetworkB = selectedQueueNetworkB;
      selectedFormTokensA = selectedQueueTokensA;
      setFormSelectedTokensB = setSelectedQueueTokensB;
    }

    return {
      selectedFormNetworkA,
      setFormSelectedNetworkB,
      setFormSelectedTokensA,
      selectedFormTokensB,
      selectedFormNetworkB,
      selectedFormTokensA,
      setFormSelectedTokensB,
    };
  }

  useEffect(() => {
    const {
      selectedFormNetworkA,
      setFormSelectedNetworkB,
      setFormSelectedTokensA,
      selectedFormTokensB,
    } = getFormConfigs();

    const networkB = networks.find(
      (network) => network.name !== selectedFormNetworkA.name,
    );
    if (networkB !== undefined) {
      setFormSelectedNetworkB(networkB);
      const tokens = selectedFormNetworkA.tokens.find(
        (item) => item.tokenA.name === selectedFormTokensB.tokenA.name,
      );
      if (tokens !== undefined) {
        setFormSelectedTokensA(tokens);
      }
    }
  }, [selectedNetworkA, selectedQueueNetworkA, typeOfTransaction]);

  useEffect(() => {
    const {
      selectedFormNetworkB,
      selectedFormTokensA,
      setFormSelectedTokensB,
    } = getFormConfigs();

    const tokens = selectedFormNetworkB.tokens.find(
      (item) => item.tokenA.name === selectedFormTokensA.tokenB.name,
    );
    if (tokens !== undefined) {
      setFormSelectedTokensB(tokens);
    }
  }, [selectedTokensA, selectedQueueTokensA, typeOfTransaction]);

  const resetNetworkSelection = () => {
    setSelectedNetworkA(defaultNetworkA);
    setSelectedTokensA(defaultNetworkA.tokens[0]);
    setSelectedNetworkB(defaultNetworkB);
    setSelectedTokensB(defaultNetworkB.tokens[0]);

    // Queue
    setSelectedQueueNetworkA(defaultQueueNetworkA);
    setSelectedQueueTokensA(defaultQueueNetworkA.tokens[0]);
    setSelectedQueueNetworkB(defaultQueueNetworkB);
    setSelectedQueueTokensB(defaultQueueNetworkB.tokens[0]);
  };

  const context: NetworkContextI = useMemo(
    () => ({
      selectedNetworkA,
      selectedTokensA,
      selectedNetworkB,
      selectedTokensB,
      setSelectedNetworkA,
      setSelectedTokensA,
      setSelectedNetworkB,
      setSelectedTokensB,

      selectedQueueNetworkA,
      selectedQueueTokensA,
      selectedQueueNetworkB,
      selectedQueueTokensB,
      setSelectedQueueNetworkA,
      setSelectedQueueTokensA,
      setSelectedQueueNetworkB,
      setSelectedQueueTokensB,

      typeOfTransaction,
      setTypeOfTransaction,
      resetNetworkSelection,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      selectedTokensA,
      selectedTokensB,
      selectedQueueTokensA,
      selectedQueueTokensB,
      typeOfTransaction,
    ],
  );

  return (
    <NetworkContext.Provider value={context}>
      {children}
    </NetworkContext.Provider>
  );
}
