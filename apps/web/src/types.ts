import { EnvironmentNetwork } from "@waveshq/walletkit-core";
/**
 * Place for common types we want to reuse in entire app
 */
import BigNumber from "bignumber.js";

export enum Network {
  Ethereum = "Ethereum",
  DeFiChain = "DeFiChain",
}

export interface TokenDetailI<T> {
  name: T;
  subtitle?: string;
  symbol: string;
  icon: string;
}

export interface AddressDetails {
  address: string;
  refundAddress: string;
  createdAt: Date;
}

export interface BridgeVersion {
  v: string;
}

interface Settings {
  transferFee: `${number}` | number;
  supportedTokens: string[];
  network?: string;
}

export interface BridgeSettings {
  defichain: Settings;
  ethereum: Settings;
}

export enum SelectionType {
  "Network" = "Network",
  "Token" = "Token",
}

export interface TokensI {
  tokenA: TokenDetailI<string>;
  tokenB: TokenDetailI<string>;
}

export interface NetworkOptionsI {
  name: Network;
  icon: string;
  tokens: TokensI[];
}

export interface TokenBalances {
  [key: string]: number;
}

export interface ProgressStepI {
  step: number;
  label: string;
}

export interface UnconfirmedTxnI {
  selectedNetworkA: NetworkOptionsI;
  selectedTokensA: TokensI;
  selectedNetworkB: NetworkOptionsI;
  selectedTokensB: TokensI;
  networkEnv: EnvironmentNetwork;
  amount: string;
  toAddress: string;
  fromAddress: string;
  dfcUniqueAddress?: string;
}

export interface UnconfirmedQueueTxnI {
  selectedQueueNetworkA: NetworkOptionsI;
  selectedQueueTokensA: TokensI;
  selectedQueueNetworkB: NetworkOptionsI;
  selectedQueueTokensB: TokensI;
  networkEnv: EnvironmentNetwork;
  amount: string;
  toAddress: string;
  fromAddress: string;
  dfcUniqueAddress?: string;
}

export interface RowDataI {
  address: string;
  networkName: Network;
  networkIcon: string;
  tokenName: string;
  tokenSymbol: string;
  tokenIcon: string;
  amount: BigNumber;
}

export interface TransferData {
  from: RowDataI;
  to: RowDataI;
}

export type Erc20Token =
  | "WBTC"
  | "USDT"
  | "USDC"
  | "ETH"
  | "EUROC"
  | "DFI"
  | "MATIC"
  | "XCHF";

interface ContractConfigI {
  address: `0x${string}`;
  abi?: any;
}

export interface ContractContextI {
  EthereumRpcUrl: string;
  ExplorerURL: string;
  HotWalletAddress: string;
  BridgeV1: ContractConfigI;
  BridgeQueue: ContractConfigI;
  Erc20Tokens: Record<Erc20Token, ContractConfigI>;
}

export enum CustomErrorCodes {
  AddressNotOwned = 0,
  AddressNotFound = 1,
  AddressNotValid = 2,
  BalanceNotMatched = 3,
  IsZeroBalance = 4,
  AmountNotValid = 5,
  TokenSymbolNotSupported = 6,
  IsBelowMinConfirmationRequired = 7,
  TxnWithExactAmountNotFound = 8,
}

export interface SignedClaim {
  signature: string;
  nonce: number;
  deadline: number;
}

export interface BridgeAnnouncement {
  id: string;
  lang: {
    en: string;
  };
  version: string;
  url?: string;
}

export interface Queue {
  id: string;
  transactionHash: string;
  ethereumStatus: EthereumTransactionStatus;
  status: QueueStatus;
  createdAt: Date;
  updatedAt: Date | null;
  amount: string | null;
  tokenSymbol: string | null;
  defichainAddress: string;
  expiryDate: Date;
  adminQueue?: null | {
    sendTransactionHash: string | null;
  };
}

export type EthereumTransactionStatus = "NOT_CONFIRMED" | "CONFIRMED";

export type QueueStatus =
  | "DRAFT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ERROR"
  | "REJECTED"
  | "EXPIRED"
  | "REFUND_REQUESTED"
  | "REFUNDED";

/* To differentiate modal to display search queue tx */
export enum ModalTypeToDisplay {
  Search,
  Processing, // queue created but getting confirmations
  Pending,
  RefundInProgress,
  Unsuccessful,
  Refunded,
  Completed,
  RefundRequested,
}
