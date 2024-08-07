import { ContractContextI } from "types";
import BridgeV1 from "./ABIs/mainnet/BridgeV1.json";
import BridgeV1Testnet from "./ABIs/testnet/BridgeV1.json";
import BridgeQueue from "./ABIs/mainnet/BridgeQueue.json";
import BridgeQueueTestnet from "./ABIs/testnet/BridgeQueue.json";

export const MAINNET_CONFIG: ContractContextI = {
  EthereumRpcUrl: "", // Required config
  ExplorerURL: "https://etherscan.io",
  BridgeV1: {
    address: "0x54346d39976629b65ba54eac1c9ef0af3be1921b",
    abi: BridgeV1,
  },
  BridgeQueue: {
    address: "0xBA188CDec7b48e6f1079256208B96f067E385Ff1",
    abi: BridgeQueue,
  },
  HotWalletAddress: "df1qgq0rjw09hr6vr7sny2m55hkr5qgze5l9hcm0lg",
  Erc20Tokens: {
    WBTC: { address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    USDT: { address: "0xdAC17F958D2ee523a2206206994597C13D831ec7" },
    USDC: { address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
    ETH: { address: "0x0000000000000000000000000000000000000000" },
    EUROC: { address: "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c" },
    DFI: { address: "0x8fc8f8269ebca376d046ce292dc7eac40c8d358a" },
    MATIC: { address: "0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0" },
    XCHF: { address: "0xb4272071ecadd69d933adcd19ca99fe80664fc08" },
  },
};

// Sepolia
export const TESTNET_CONFIG: ContractContextI = {
  EthereumRpcUrl: "https://rpc.ankr.com/eth_sepolia",
  ExplorerURL: "https://sepolia.etherscan.io",
  BridgeV1: {
    address: "0x62cAa18a745b3d61E81f64e5B47c1A21dE8155bA",
    abi: BridgeV1Testnet,
  },
  BridgeQueue: {
    address: "0x29D6d5f8ad010b548D0dC68d8b50c043c4bED1Cc",
    abi: BridgeQueueTestnet,
  },
  HotWalletAddress: "tf1qsckyp02vdzaf95cjl5dr95n8stcalze0pfswcp",
  Erc20Tokens: {
    WBTC: { address: "0x8B3d701B187D8Eb8c0b9368AebbAAFC62D3fa0e1" },
    USDT: { address: "0x5e19180828c6942b42e3cE860C564610e064fEee" },
    USDC: { address: "0x754028ed11D02f8f255410d32704839C33142b44" },
    ETH: { address: "0x0000000000000000000000000000000000000000" },
    EUROC: { address: "0xc8042c992c9627dF9e84ddf57Bc6adc1AB9C3acd" },
    DFI: { address: "0x1f84B07483AC2D5f212a7bF14184310baE087448" },
    MATIC: { address: "0x0B36470228F0B8C8E0313ba0C4356520F50cE85b" },
    XCHF: { address: "0x75bff147629E93F508483062EE3AeD466028c807" },
  },
};
