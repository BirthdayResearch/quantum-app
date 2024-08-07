import useBridgeFormStorageKeys from "@hooks/useBridgeFormStorageKeys";
import { getStorageItem, setStorageItem } from "@utils/localStorage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  PropsWithChildren,
} from "react";
import { AddressDetails, UnconfirmedQueueTxnI } from "types";
import { useNetworkEnvironmentContext } from "./NetworkEnvironmentContext";

type StorageKey =
  | "confirmed-queue"
  | "allocation-txn-hash-queue"
  | "unconfirmed-queue"
  | "reverted-queue"
  | "unsent-fund-queue"
  | "dfc-address-queue"
  | "dfc-address-details-queue"
  | "txn-form-queue"
  | "transfer-amount-queue"
  | "transfer-display-symbol-A-queue"
  | "transfer-display-symbol-B-queue"
  | "created-queue-txn-hash";

interface StorageContextQueueI {
  txnHash: {
    confirmed?: string;
    unconfirmed?: string;
    reverted?: string;
    unsentFund?: string;
    allocationTxn?: string;
  };
  dfcAddress?: string;
  dfcAddressDetails?: AddressDetails;
  txnForm?: UnconfirmedQueueTxnI;
  transferAmount?: string;
  transferDisplaySymbolA?: string;
  transferDisplaySymbolB?: string;
  getStorage: (key: StorageKey) => string | undefined;
  setStorage: (key: StorageKey, value: string | null) => void;
  createdQueueTxnHash?: string;
}

/*
  - To serve as a global state that syncs with the local storage
*/
const StorageContextQueue = createContext<StorageContextQueueI>(
  undefined as any,
);

export function useQueueStorageContext(): StorageContextQueueI {
  return useContext(StorageContextQueue);
}

export function QueueStorageProvider({
  children,
}: PropsWithChildren<any>): JSX.Element | null {
  const [unconfirmedQueueTxnHashKey, setUnconfirmedQueueTxnHashKey] =
    useState<string>();
  const [confirmedQueueTxnHashKey, setConfirmedQueueTxnHashKey] =
    useState<string>();
  const [allocationQueueTxnHashKey, setAllocationQueueTxnHashKey] =
    useState<string>();
  const [revertedQueueTxnHashKey, setRevertedQueueTxnHashKey] =
    useState<string>();
  const [unsentQueueFundTxnHashKey, setUnsentQueueFundTxnHashKey] =
    useState<string>();
  const [dfcQueueAddress, setDfcQueueAddress] = useState<string>();
  const [dfcQueueAddressDetails, setDfcQueueAddressDetails] =
    useState<AddressDetails>();
  const [queueTxnForm, setQueueTxnForm] = useState<any>();
  const [queueTransferAmount, setQueueTransferAmount] = useState<string>();
  const [queueTransferDisplaySymbolA, setQueueTransferDisplaySymbolA] =
    useState<string>();
  const [queueTransferDisplaySymbolB, setQueueTransferDisplaySymbolB] =
    useState<string>();
  const [createdQueueTxn, setCreatedQueueTxn] = useState<string>();

  const { networkEnv } = useNetworkEnvironmentContext();

  const {
    UNCONFIRMED_QUEUE_TXN_HASH_KEY,
    CONFIRMED_QUEUE_TXN_HASH_KEY,
    REVERTED_QUEUE_TXN_HASH_KEY,
    UNSENT_QUEUE_FUND_TXN_HASH_KEY,
    QUEUE_TXN_KEY,
    QUEUE_DFC_ADDR_KEY,
    QUEUE_DFC_ADDR_DETAILS_KEY,
    QUEUE_ALLOCATION_TXN_HASH_KEY,
    QUEUE_TRANSFER_AMOUNT_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_A_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_B_KEY,
    QUEUE_CREATION_KEY,
  } = useBridgeFormStorageKeys();

  useEffect(() => {
    // Both ways
    const txnFormStorage =
      getStorageItem<UnconfirmedQueueTxnI>(QUEUE_TXN_KEY) ?? undefined;
    setQueueTxnForm(txnFormStorage);

    // EVM -> DFC
    const unconfirmedTxnHashKeyStorage =
      getStorageItem<string>(UNCONFIRMED_QUEUE_TXN_HASH_KEY) ?? undefined;
    const confirmedTxnHashKeyStorage =
      getStorageItem<string>(CONFIRMED_QUEUE_TXN_HASH_KEY) ?? undefined;
    const allocationTxnHashKeyStorage =
      getStorageItem<string>(QUEUE_ALLOCATION_TXN_HASH_KEY) ?? undefined;
    const revertedTxnHashKeyStorage =
      getStorageItem<string>(REVERTED_QUEUE_TXN_HASH_KEY) ?? undefined;
    const unsentFundTxnHashKeyStorage =
      getStorageItem<string>(UNSENT_QUEUE_FUND_TXN_HASH_KEY) ?? undefined;
    const dfcAddressKeyStorage =
      getStorageItem<string>(QUEUE_DFC_ADDR_KEY) ?? undefined;
    const transferAmountKeyStorage =
      getStorageItem<string>(QUEUE_TRANSFER_AMOUNT_KEY) ?? undefined;
    const transferDisplaySymbolAKeyStorage =
      getStorageItem<string>(QUEUE_TRANSFER_DISPLAY_SYMBOL_A_KEY) ?? undefined;
    const transferDisplaySymbolBKeyStorage =
      getStorageItem<string>(QUEUE_TRANSFER_DISPLAY_SYMBOL_B_KEY) ?? undefined;
    const createdQueueStorageKey =
      getStorageItem<string>(QUEUE_CREATION_KEY) ?? undefined;

    setUnconfirmedQueueTxnHashKey(unconfirmedTxnHashKeyStorage);
    setConfirmedQueueTxnHashKey(confirmedTxnHashKeyStorage);
    setAllocationQueueTxnHashKey(allocationTxnHashKeyStorage);
    setRevertedQueueTxnHashKey(revertedTxnHashKeyStorage);
    setUnsentQueueFundTxnHashKey(unsentFundTxnHashKeyStorage);
    setDfcQueueAddress(dfcAddressKeyStorage);
    setQueueTransferAmount(transferAmountKeyStorage);
    setQueueTransferDisplaySymbolA(transferDisplaySymbolAKeyStorage);
    setQueueTransferDisplaySymbolB(transferDisplaySymbolBKeyStorage);
    setCreatedQueueTxn(createdQueueStorageKey);
  }, [
    networkEnv,
    UNCONFIRMED_QUEUE_TXN_HASH_KEY,
    CONFIRMED_QUEUE_TXN_HASH_KEY,
    REVERTED_QUEUE_TXN_HASH_KEY,
    UNSENT_QUEUE_FUND_TXN_HASH_KEY,
    QUEUE_TXN_KEY,
    QUEUE_DFC_ADDR_KEY,
    QUEUE_DFC_ADDR_DETAILS_KEY,
    QUEUE_ALLOCATION_TXN_HASH_KEY,
    QUEUE_TRANSFER_AMOUNT_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_A_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_B_KEY,
    QUEUE_CREATION_KEY,
  ]);

  const context: StorageContextQueueI = useMemo(() => {
    const setStorage = (key: StorageKey, value: string) => {
      switch (key) {
        case "confirmed-queue":
          setConfirmedQueueTxnHashKey(value);
          setStorageItem(CONFIRMED_QUEUE_TXN_HASH_KEY, value);
          break;
        case "reverted-queue":
          setRevertedQueueTxnHashKey(value);
          setStorageItem(REVERTED_QUEUE_TXN_HASH_KEY, value);
          break;
        case "unsent-fund-queue":
          setUnsentQueueFundTxnHashKey(value);
          setStorageItem(UNSENT_QUEUE_FUND_TXN_HASH_KEY, value);
          break;
        case "allocation-txn-hash-queue":
          setStorageItem(QUEUE_ALLOCATION_TXN_HASH_KEY, value);
          break;
        case "dfc-address-queue":
          setDfcQueueAddress(value);
          setStorageItem(QUEUE_DFC_ADDR_KEY, value);
          break;
        case "unconfirmed-queue":
          setUnconfirmedQueueTxnHashKey(value);
          setStorageItem(UNCONFIRMED_QUEUE_TXN_HASH_KEY, value);
          break;
        case "dfc-address-details-queue":
          setDfcQueueAddressDetails(JSON.parse(value));
          setStorageItem(QUEUE_DFC_ADDR_DETAILS_KEY, JSON.parse(value));
          break;
        case "txn-form-queue":
          setQueueTxnForm(JSON.parse(value));
          setStorageItem(QUEUE_TXN_KEY, JSON.parse(value));
          break;
        case "transfer-amount-queue":
          setQueueTransferAmount(value);
          setStorageItem(QUEUE_TRANSFER_AMOUNT_KEY, value);
          break;
        case "transfer-display-symbol-A-queue":
          setQueueTransferDisplaySymbolA(value);
          setStorageItem(QUEUE_TRANSFER_DISPLAY_SYMBOL_A_KEY, value);
          break;
        case "transfer-display-symbol-B-queue":
          setQueueTransferDisplaySymbolB(value);
          setStorageItem(QUEUE_TRANSFER_DISPLAY_SYMBOL_B_KEY, value);
          break;
        case "created-queue-txn-hash":
          setCreatedQueueTxn(value);
          setStorageItem(QUEUE_CREATION_KEY, value);
          break;
        default:
        // no action needed ( using switch as switch faster than if else )
      }
    };

    const getStorage = (key: StorageKey) => {
      let value;
      switch (key) {
        case "confirmed-queue":
          value = confirmedQueueTxnHashKey;
          break;
        case "unconfirmed-queue":
          value = unconfirmedQueueTxnHashKey;
          break;
        case "allocation-txn-hash-queue":
          value = allocationQueueTxnHashKey;
          break;
        case "unsent-fund-queue":
          value = unsentQueueFundTxnHashKey;
          break;
        case "reverted-queue":
          value = revertedQueueTxnHashKey;
          break;
        case "dfc-address-queue":
          value = dfcQueueAddress;
          break;
        case "dfc-address-details-queue":
          value = dfcQueueAddressDetails;
          break;
        case "txn-form-queue":
          value = queueTxnForm;
          break;
        case "transfer-amount-queue":
          value = queueTransferAmount;
          break;
        case "transfer-display-symbol-A-queue":
          value = queueTransferDisplaySymbolA;
          break;
        case "transfer-display-symbol-B-queue":
          value = queueTransferDisplaySymbolB;
          break;
        case "created-queue-txn-hash":
          value = createdQueueTxn;
          break;
        default:
        // no action needed ( using switch as switch faster than if else )
      }
      return value;
    };
    return {
      txnHash: {
        confirmed:
          confirmedQueueTxnHashKey === null
            ? undefined
            : confirmedQueueTxnHashKey,
        unconfirmed:
          unconfirmedQueueTxnHashKey === null
            ? undefined
            : unconfirmedQueueTxnHashKey,
        reverted:
          revertedQueueTxnHashKey === null
            ? undefined
            : revertedQueueTxnHashKey,
        unsentFund:
          unsentQueueFundTxnHashKey === null
            ? undefined
            : unsentQueueFundTxnHashKey,
        allocationTxn:
          allocationQueueTxnHashKey === null
            ? undefined
            : allocationQueueTxnHashKey,
      },
      dfcAddress: dfcQueueAddress === null ? undefined : dfcQueueAddress,
      dfcAddressDetails:
        dfcQueueAddressDetails === null ? undefined : dfcQueueAddressDetails,
      txnForm: queueTxnForm === null ? undefined : queueTxnForm,
      transferAmount:
        queueTransferAmount === null ? undefined : queueTransferAmount,
      transferDisplaySymbolA:
        queueTransferDisplaySymbolA === null
          ? undefined
          : queueTransferDisplaySymbolA,
      transferDisplaySymbolB:
        queueTransferDisplaySymbolB === null
          ? undefined
          : queueTransferDisplaySymbolB,
      getStorage,
      setStorage,
      createdQueueTxnHash:
        createdQueueTxn === null ? undefined : createdQueueTxn,
    };
  }, [
    unconfirmedQueueTxnHashKey,
    confirmedQueueTxnHashKey,
    allocationQueueTxnHashKey,
    revertedQueueTxnHashKey,
    unsentQueueFundTxnHashKey,
    dfcQueueAddress,
    dfcQueueAddressDetails,
    queueTxnForm,
    queueTransferAmount,
    createdQueueTxn,
    UNCONFIRMED_QUEUE_TXN_HASH_KEY,
    CONFIRMED_QUEUE_TXN_HASH_KEY,
    REVERTED_QUEUE_TXN_HASH_KEY,
    UNSENT_QUEUE_FUND_TXN_HASH_KEY,
    QUEUE_TXN_KEY,
    QUEUE_DFC_ADDR_KEY,
    QUEUE_DFC_ADDR_DETAILS_KEY,
    QUEUE_ALLOCATION_TXN_HASH_KEY,
    QUEUE_TRANSFER_AMOUNT_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_A_KEY,
    QUEUE_TRANSFER_DISPLAY_SYMBOL_B_KEY,
    QUEUE_CREATION_KEY,
  ]);

  return (
    <StorageContextQueue.Provider value={context}>
      {children}
    </StorageContextQueue.Provider>
  );
}
