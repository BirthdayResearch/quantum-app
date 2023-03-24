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
  | "dfc-address-details"
  | "txn-form";

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
  const [txnForm, setTxnForm] = useState<any>();

  const { networkEnv } = useNetworkEnvironmentContext();

  const {
    UNCONFIRMED_TXN_HASH_KEY,
    CONFIRMED_TXN_HASH_KEY,
    REVERTED_TXN_HASH_KEY,
    ALLOCATION_TXN_HASH_KEY,
    UNSENT_FUND_TXN_HASH_KEY,
    DFC_ADDR_KEY,
    DFC_ADDR_DETAILS_KEY,
    TXN_KEY,
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

    setUnconfirmedTxnHashKey(unconfirmedTxnHashKeyStorage);
    setConfirmedTxnHashKey(confirmedTxnHashKeyStorage);
    setAllocationTxnHashKey(allocationTxnHashKeyStorage);
    setRevertedTxnHashKey(revertedTxnHashKeyStorage);
    setUnsentFundTxnHashKey(unsentFundTxnHashKeyStorage);
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
      } else if (key === "txn-form") {
        setTxnForm(JSON.parse(value));
        setStorageItem(TXN_KEY, JSON.parse(value));
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
      } else if (key === "txn-form") {
        value = txnForm;
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
      txnForm: txnForm === null ? undefined : txnForm,
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
    txnForm,
    REVERTED_TXN_HASH_KEY,
    CONFIRMED_TXN_HASH_KEY,
    ALLOCATION_TXN_HASH_KEY,
    UNCONFIRMED_TXN_HASH_KEY,
    UNSENT_FUND_TXN_HASH_KEY,
    DFC_ADDR_KEY,
    DFC_ADDR_DETAILS_KEY,
    TXN_KEY,
  ]);

  return (
    <StorageContext.Provider value={context}>
      {children}
    </StorageContext.Provider>
  );
}
