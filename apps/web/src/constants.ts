interface TooltipInfoI {
  title: string;
  content: string;
}

export const FEES_INFO: TooltipInfoI = {
  title: "Fees",
  content:
    "Fees to cover the cost of transactions on DeFiChain and Ethereum networks. For more information, visit our user guide.",
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
}

export const STORAGE_DFC_ADDR_KEY = "unconfirmed-txn-dfc-address";
export const STORAGE_DFC_ADDR_DETAILS = "txn-dfc-address-details";
export const ETHEREUM_SYMBOL = "ETH";
export const CONFIRMATIONS_BLOCK_TOTAL = 100; // 65 in EVM, 35 in DFC
export const EVM_CONFIRMATIONS_BLOCK_TOTAL = 65;
export const DFC_CONFIRMATIONS_BLOCK_TOTAL = 35;

export const ETHEREUM_MAINNET_ID = 1;
