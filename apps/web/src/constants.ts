import { mainnet } from "wagmi";

interface TooltipInfoI {
  title: string;
  content: string;
}

export const FEES_INFO: TooltipInfoI = {
  title: "Fees",
  content:
    "Fees to cover the cost of transactions on DeFiChain and Ethereum networks. For more information, visit our user guide.",
};

export const PROCESSING_TIME_INFO: TooltipInfoI = {
  title: "Processing time",
  content: "The estimated duration for processing your transaction on Queue.",
};

export const TOKEN_SUPPLY_INFO: TooltipInfoI = {
  title: "Token Supply",
  content:
    "Token supply indicates the amount of liquidity currently available for a particular token pair on DeFiChain Bridge",
};

export const TRANSACTION_ERROR_INFO: TooltipInfoI = {
  title: "Transaction Error",
  content:
    "In case of any transaction errors, we will fully refund your dTokens to the below address.",
};

export const DISCLAIMER_MESSAGE =
  "Transactions are irreversible. Ensure the amount and DeFiChain address is correct.";

export const METAMASK_REJECT_MESSAGE = "User rejected the request";

export const DFC_TO_API_RESET_TIME_LIMIT = 1000 * 60; // 1 min api reset time

export const DFC_TO_ERC_RESET_FORM_TIME_LIMIT = 1000 * 60 * 60 * 24; // 1 Day address expiry time

export const STORAGE_TXN_KEY = "unconfirmed-txn";
export const STORAGE_UNCONFIRMED_TXN_HASH_KEY = "unconfirmed-txn-hash";
export const STORAGE_CONFIRMED_TXN_HASH_KEY = "confirmed-txn-hash";
export const STORAGE_ALLOCATION_TXN_HASH_KEY = "allocation-txn-hash";
export const STORAGE_REVERTED_TXN_HASH_KEY = "reverted-txn-hash";
export const STORAGE_UNSENT_FUND_TXN_HASH_KEY = "unsent-txn-hash";

export enum BridgeStatus {
  IsTokenApprovalInProgress = 0,
  IsTokenApproved = 1,
  IsTokenRejected = 2,
  NoTxCreated = 3,
  TxHashBridgetoDfcError = 4,
  IsBridgeToDfcInProgress = 5,
  QueueingTransaction = 6, // only for queue tab
}

export const STORAGE_DFC_ADDR_KEY = "unconfirmed-txn-dfc-address";
export const STORAGE_DFC_ADDR_DETAILS = "txn-dfc-address-details";
export const STORAGE_DESTINATION_ADDRESS_KEY = "destination-address";
export const STORAGE_TRANSFER_AMOUNT_KEY = "transfer-amount";
export const STORAGE_TRANSFER_DISPLAY_SYMBOL_A_KEY =
  "transfer-display-symbol-A";
export const STORAGE_TRANSFER_DISPLAY_SYMBOL_B_KEY =
  "transfer-display-symbol-B";

export const ETHEREUM_SYMBOL = "ETH";
export const CONFIRMATIONS_BLOCK_TOTAL = 100; // 65 in EVM, 35 in DFC
export const EVM_CONFIRMATIONS_BLOCK_TOTAL = 65;
export const DFC_CONFIRMATIONS_BLOCK_TOTAL = 35;

export const ETHEREUM_MAINNET_ID = mainnet.id;
export const ETHEREUM_TESTNET_ID = 5;
export const GWEI_DECIMAL = 9; // Source: https://docs.ethers.org/v5/api/utils/display-logic/

// QUEUE
export const QUEUE_STORAGE_TXN_KEY = "unconfirmed-txn-queue";
export const QUEUE_STORAGE_UNCONFIRMED_TXN_HASH_KEY =
  "unconfirmed-txn-hash-queue";
export const QUEUE_STORAGE_CONFIRMED_TXN_HASH_KEY = "confirmed-txn-hash-queue";
export const QUEUE_STORAGE_ALLOCATION_TXN_HASH_KEY =
  "allocation-txn-hash-queue";
export const QUEUE_STORAGE_REVERTED_TXN_HASH_KEY = "reverted-txn-hash-queue";
export const QUEUE_STORAGE_UNSENT_FUND_TXN_HASH_KEY = "unsent-txn-hash-queue";

export const QUEUE_STORAGE_DFC_ADDR_KEY = "unconfirmed-txn-dfc-address-queue";
export const QUEUE_STORAGE_DFC_ADDR_DETAILS = "txn-dfc-address-details-queue";

export const QUEUE_STORAGE_TRANSFER_AMOUNT_KEY = "transfer-amount-queue";
export const QUEUE_STORAGE_TRANSFER_DISPLAY_SYMBOL_A_KEY =
  "transfer-display-symbol-A-queue";
export const QUEUE_STORAGE_TRANSFER_DISPLAY_SYMBOL_B_KEY =
  "transfer-display-symbol-B-queue";
export const STORAGE_QUEUE_CREATION_KEY = "created-queue-txn-hash";
