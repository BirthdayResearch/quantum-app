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
import { AddressDetails, UnconfirmedTxnI } from "types";
import { useNetworkEnvironmentContext } from "./NetworkEnvironmentContext";

type StorageKey =
  | "confirmed"
  | "allocationTxnHash"
  | "unconfirmed"
  | "reverted"
  | "unsent-fund"
  | "dfc-address"
  | "destination-address"
  | "dfc-address-details"
  | "txn-form"
  | "transfer-amount"
  | "transfer-display-symbol-A"
  | "transfer-display-symbol-B";

interface StorageContextI {
  txnHash: {
    confirmed?: string;
    unconfirmed?: string;
    reverted?: string;
    unsentFund?: string;
    allocationTxn?: string;
  };
  dfcAddress?: string;
  dfcAddressDetails?: AddressDetails;
  txnForm?: UnconfirmedTxnI;
  transferAmount?: string;
  transferDisplaySymbolA?: string;
  transferDisplaySymbolB?: string;
  destinationAddress?: string;
  getStorage: (key: StorageKey) => string | undefined;
  setStorage: (key: StorageKey, value: string | null) => void;
}

/*
  - To serve as a global state that syncs with the local storage 
*/
const StorageContext = createContext<StorageContextI>(undefined as any);

export function useStorageContext(): StorageContextI {
  return useContext(StorageContext);
}

export function StorageProvider({
  children,
}: PropsWithChildren<any>): JSX.Element | null {
  const [unconfirmedTxnHashKey, setUnconfirmedTxnHashKey] = useState<string>();
  const [confirmedTxnHashKey, setConfirmedTxnHashKey] = useState<string>();
  const [allocationTxnHashKey, setAllocationTxnHashKey] = useState<string>();
  const [revertedTxnHashKey, setRevertedTxnHashKey] = useState<string>();
  const [unsentFundTxnHashKey, setUnsentFundTxnHashKey] = useState<string>();
  const [dfcAddress, setDfcAddress] = useState<string>();
  const [dfcAddressDetails, setDfcAddressDetails] = useState<AddressDetails>();
  const [destinationAddress, setDestinationAddress] = useState<string>();
  const [txnForm, setTxnForm] = useState<any>();
  const [transferAmount, setTransferAmount] = useState<string>();
  const [transferDisplaySymbolA, setTransferDisplaySymbolA] =
    useState<string>();
  const [transferDisplaySymbolB, setTransferDisplaySymbolB] =
    useState<string>();

  const { networkEnv } = useNetworkEnvironmentContext();

  const {
    UNCONFIRMED_TXN_HASH_KEY,
    CONFIRMED_TXN_HASH_KEY,
    REVERTED_TXN_HASH_KEY,
    ALLOCATION_TXN_HASH_KEY,
    UNSENT_FUND_TXN_HASH_KEY,
    DFC_ADDR_KEY,
    DFC_ADDR_DETAILS_KEY,
    DESTINATION_ADDRESS_KEY,
    TXN_KEY,
    TRANSFER_AMOUNT_KEY,
    TRANSFER_DISPLAY_SYMBOL_A_KEY,
    TRANSFER_DISPLAY_SYMBOL_B_KEY,
  } = useBridgeFormStorageKeys();

  useEffect(() => {
    // Both ways
    const txnFormStorage =
      getStorageItem<UnconfirmedTxnI>(TXN_KEY) ?? undefined;
    setTxnForm(txnFormStorage);

    // DFC -> EVM
    const dfcAddressStorage = getStorageItem<string>(DFC_ADDR_KEY) ?? undefined;
    const dfcAddressDetailsStorage =
      getStorageItem<AddressDetails>(DFC_ADDR_DETAILS_KEY) ?? undefined;

    setDfcAddress(dfcAddressStorage);
    setDfcAddressDetails(dfcAddressDetailsStorage);

    // EVM -> DFC
    const unconfirmedTxnHashKeyStorage =
      getStorageItem<string>(UNCONFIRMED_TXN_HASH_KEY) ?? undefined;
    const confirmedTxnHashKeyStorage =
      getStorageItem<string>(CONFIRMED_TXN_HASH_KEY) ?? undefined;
    const allocationTxnHashKeyStorage =
      getStorageItem<string>(ALLOCATION_TXN_HASH_KEY) ?? undefined;
    const revertedTxnHashKeyStorage =
      getStorageItem<string>(REVERTED_TXN_HASH_KEY) ?? undefined;
    const unsentFundTxnHashKeyStorage =
      getStorageItem<string>(UNSENT_FUND_TXN_HASH_KEY) ?? undefined;
    const dfcAddressKeyStorage =
      getStorageItem<string>(DFC_ADDR_KEY) ?? undefined;
    const destinationAddressKeyStorage =
      getStorageItem<string>(DESTINATION_ADDRESS_KEY) ?? undefined;
    const transferAmountKeyStorage =
      getStorageItem<string>(TRANSFER_AMOUNT_KEY) ?? undefined;
    const transferDisplaySymbolAKeyStorage =
      getStorageItem<string>(TRANSFER_DISPLAY_SYMBOL_A_KEY) ?? undefined;
    const transferDisplaySymbolBKeyStorage =
      getStorageItem<string>(TRANSFER_DISPLAY_SYMBOL_B_KEY) ?? undefined;

    setUnconfirmedTxnHashKey(unconfirmedTxnHashKeyStorage);
    setConfirmedTxnHashKey(confirmedTxnHashKeyStorage);
    setAllocationTxnHashKey(allocationTxnHashKeyStorage);
    setRevertedTxnHashKey(revertedTxnHashKeyStorage);
    setUnsentFundTxnHashKey(unsentFundTxnHashKeyStorage);
    setDfcAddress(dfcAddressKeyStorage);
    setDestinationAddress(destinationAddressKeyStorage);
    setTransferAmount(transferAmountKeyStorage);
    setTransferDisplaySymbolA(transferDisplaySymbolAKeyStorage);
    setTransferDisplaySymbolB(transferDisplaySymbolBKeyStorage);
  }, [
    networkEnv,
    CONFIRMED_TXN_HASH_KEY,
    ALLOCATION_TXN_HASH_KEY,
    UNCONFIRMED_TXN_HASH_KEY,
    REVERTED_TXN_HASH_KEY,
    UNSENT_FUND_TXN_HASH_KEY,
    DFC_ADDR_KEY,
    DFC_ADDR_DETAILS_KEY,
    TXN_KEY,
    TRANSFER_AMOUNT_KEY,
    TRANSFER_DISPLAY_SYMBOL_A_KEY,
    TRANSFER_DISPLAY_SYMBOL_B_KEY,
  ]);

  const context: StorageContextI = useMemo(() => {
    const setStorage = (key: StorageKey, value: string) => {
      if (key === "confirmed") {
        setConfirmedTxnHashKey(value);
        setStorageItem(CONFIRMED_TXN_HASH_KEY, value);
      } else if (key === "reverted") {
        setRevertedTxnHashKey(value);
        setStorageItem(REVERTED_TXN_HASH_KEY, value);
      } else if (key === "unsent-fund") {
        setUnsentFundTxnHashKey(value);
        setStorageItem(UNSENT_FUND_TXN_HASH_KEY, value);
      } else if (key === "allocationTxnHash") {
        setAllocationTxnHashKey(value);
        setStorageItem(ALLOCATION_TXN_HASH_KEY, value);
      } else if (key === "dfc-address") {
        setDfcAddress(value);
        setStorageItem(DFC_ADDR_KEY, value);
      } else if (key === "unconfirmed") {
        setUnconfirmedTxnHashKey(value);
        setStorageItem(UNCONFIRMED_TXN_HASH_KEY, value);
      } else if (key === "dfc-address-details") {
        setDfcAddressDetails(JSON.parse(value));
        setStorageItem(DFC_ADDR_DETAILS_KEY, JSON.parse(value));
      } else if (key === "destination-address") {
        setDestinationAddress(value);
        setStorageItem(DESTINATION_ADDRESS_KEY, value);
      } else if (key === "txn-form") {
        setTxnForm(JSON.parse(value));
        setStorageItem(TXN_KEY, JSON.parse(value));
      } else if (key === "transfer-amount") {
        setTransferAmount(value);
        setStorageItem(TRANSFER_AMOUNT_KEY, value);
      } else if (key === "transfer-display-symbol-A") {
        setTransferDisplaySymbolA(value);
        setStorageItem(TRANSFER_DISPLAY_SYMBOL_A_KEY, value);
      } else if (key === "transfer-display-symbol-B") {
        setTransferDisplaySymbolB(value);
        setStorageItem(TRANSFER_DISPLAY_SYMBOL_B_KEY, value);
      }
    };

    const getStorage = (key: StorageKey) => {
      let value;

      if (key === "confirmed") {
        value = confirmedTxnHashKey;
      } else if (key === "unconfirmed") {
        value = unconfirmedTxnHashKey;
      } else if (key === "allocationTxnHash") {
        value = allocationTxnHashKey;
      } else if (key === "unsent-fund") {
        value = unsentFundTxnHashKey;
      } else if (key === "reverted") {
        value = revertedTxnHashKey;
      } else if (key === "dfc-address") {
        value = dfcAddress;
      } else if (key === "dfc-address-details") {
        value = dfcAddressDetails;
      } else if (key === "destination-address") {
        value = destinationAddress;
      } else if (key === "txn-form") {
        value = txnForm;
      } else if (key === "transfer-amount") {
        value = transferAmount;
      } else if (key === "transfer-display-symbol-A") {
        value = transferDisplaySymbolA;
      } else if (key === "transfer-display-symbol-B") {
        value = transferDisplaySymbolB;
      }

      return value;
    };
    return {
      txnHash: {
        confirmed:
          confirmedTxnHashKey === null ? undefined : confirmedTxnHashKey,
        unconfirmed:
          unconfirmedTxnHashKey === null ? undefined : unconfirmedTxnHashKey,
        reverted: revertedTxnHashKey === null ? undefined : revertedTxnHashKey,
        unsentFund:
          unsentFundTxnHashKey === null ? undefined : unsentFundTxnHashKey,
        allocationTxn:
          allocationTxnHashKey === null ? undefined : allocationTxnHashKey,
      },
      dfcAddress: dfcAddress === null ? undefined : dfcAddress,
      dfcAddressDetails:
        dfcAddressDetails === null ? undefined : dfcAddressDetails,
      destinationAddress:
        destinationAddress === null ? undefined : destinationAddress,
      txnForm: txnForm === null ? undefined : txnForm,
      transferAmount: transferAmount === null ? undefined : transferAmount,
      transferDisplaySymbolA:
        transferDisplaySymbolA === null ? undefined : transferDisplaySymbolA,
      transferDisplaySymbolB:
        transferDisplaySymbolB === null ? undefined : transferDisplaySymbolB,
      getStorage,
      setStorage,
    };
  }, [
    unconfirmedTxnHashKey,
    confirmedTxnHashKey,
    allocationTxnHashKey,
    revertedTxnHashKey,
    unsentFundTxnHashKey,
    dfcAddress,
    dfcAddressDetails,
    destinationAddress,
    txnForm,
    transferAmount,
    transferDisplaySymbolA,
    transferDisplaySymbolB,
    REVERTED_TXN_HASH_KEY,
    CONFIRMED_TXN_HASH_KEY,
    ALLOCATION_TXN_HASH_KEY,
    UNCONFIRMED_TXN_HASH_KEY,
    UNSENT_FUND_TXN_HASH_KEY,
    DFC_ADDR_KEY,
    DFC_ADDR_DETAILS_KEY,
    DESTINATION_ADDRESS_KEY,
    TXN_KEY,
    TRANSFER_AMOUNT_KEY,
    TRANSFER_DISPLAY_SYMBOL_A_KEY,
    TRANSFER_DISPLAY_SYMBOL_B_KEY,
  ]);

  return (
    <StorageContext.Provider value={context}>
      {children}
    </StorageContext.Provider>
  );
}
