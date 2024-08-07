import { useEffect, useState } from "react";
import BridgeForm from "@components/BridgeForm";
import WelcomeHeader from "@components/WelcomeHeader";
import MobileBottomMenu from "@components/MobileBottomMenu";
import { useStorageContext } from "@contexts/StorageContext";
import { FormOptions } from "@contexts/NetworkContext";
import Logging from "@api/logging";
import { getStorageItem } from "@utils/localStorage";
import { DEFICHAIN_WALLET_URL } from "config/networkUrl";
import useBridgeFormStorageKeys from "../hooks/useBridgeFormStorageKeys";
import QueueForm from "../components/QueueForm";
import FormTab from "../components/FormTab";
import { useQueueStorageContext } from "../layouts/contexts/QueueStorageContext";

function Home() {
  const { txnHash } = useStorageContext();
  const { txnHash: txnHashQueue, createdQueueTxnHash } =
    useQueueStorageContext();
  const { UNCONFIRMED_TXN_HASH_KEY, UNSENT_FUND_TXN_HASH_KEY } =
    useBridgeFormStorageKeys();

  useEffect(() => {
    const unloadCallback = (e) => {
      const event = e;
      const unconfirmedHash = getStorageItem<string>(UNCONFIRMED_TXN_HASH_KEY);
      const unsentFundHash = getStorageItem<string>(UNSENT_FUND_TXN_HASH_KEY);
      if (unconfirmedHash !== undefined || unsentFundHash !== undefined) {
        // display native reload warning modal if there is unconfirmed txn ongoing
        event.preventDefault();
        event.returnValue = "";
        return "";
      }
      return false;
    };
    window.addEventListener("beforeunload", unloadCallback);
    return () => window.removeEventListener("beforeunload", unloadCallback);
  }, [UNCONFIRMED_TXN_HASH_KEY, UNSENT_FUND_TXN_HASH_KEY]);

  const [activeTab, setActiveTab] = useState(FormOptions.INSTANT);

  return (
    <section className="relative flex flex-col" data-testid="homepage">
      <div className="flex flex-col justify-between md:flex-row w-full px-0 md:px-12 lg:px-[120px]">
        <div className="flex flex-col justify-between px-6 pb-7 md:px-0 md:pb-0 md:w-5/12 mt-6 mb-5 md:mb-0 lg:mt-12">
          <WelcomeHeader />
        </div>
        <div className="flex-1 md:w-6/12 lg:min-w-[562px] lg:ml-24">
          <FormTab activeTab={activeTab} setActiveTab={setActiveTab} />

          <BridgeForm
            activeTab={activeTab}
            hasPendingTxn={
              txnHash.unconfirmed !== undefined ||
              txnHash.unsentFund !== undefined
            }
            setActiveTab={setActiveTab}
          />
          <QueueForm
            activeTab={activeTab}
            hasPendingTxn={
              createdQueueTxnHash !== undefined &&
              (txnHashQueue.unconfirmed !== undefined ||
                txnHashQueue.unsentFund !== undefined)
            }
            setActiveTab={setActiveTab}
          />
        </div>
      </div>
      <div className="md:hidden mt-6 mb-12 mx-6">
        <MobileBottomMenu />
      </div>
    </section>
  );
}

export async function getServerSideProps() {
  const props = { isBridgeUp: true };

  try {
    const res = await fetch(`${DEFICHAIN_WALLET_URL}/bridge/status`);
    const data = await res.json();
    if (res.status === 200) {
      props.isBridgeUp = data?.isUp;
    } else {
      Logging.error("Get bridge status API error.");
    }
  } catch (e) {
    Logging.error(`${e}`);
  }

  return { props };
}

export default Home;
