import Logging from "@api/logging";
import { useState, useEffect } from "react";
import { useDeFiScanContext } from "@contexts/DeFiScanContext";
import { EnvironmentNetwork } from "@waveshq/walletkit-core";
import OverviewList from "@components/OverviewList";
import { useBridgeBalancesMutation } from "@store/index";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import EnvironmentNetworkSwitch from "@components/EnvironmentNetworkSwitch";
import BASE_URLS from "../../config/networkUrl";

export default function LiquidityOverview({ defaultBalances }) {
  const { getPOBUrl } = useDeFiScanContext();
  const { networkEnv } = useNetworkEnvironmentContext();

  const [balances, seBalances] = useState(defaultBalances);
  const [getBridgeBalance] = useBridgeBalancesMutation();

  useEffect(() => {
    getBridgeBalance({})
      .unwrap()
      .then((data) => {
        seBalances(data);
      });
  }, [networkEnv]);

  return (
    <section className="relative flex flex-col" data-testid="liquidityOverview">
      <div className="justify-between md:flex-row w-full px-0 md:px-12 lg:px-[120px]">
        <div className="flex flex-col justify-between px-6 md:px-0 my-6 md:mb-8 md:mt-0 lg:mt-12">
          <div className="flex text-dark-900 font-bold text-xl lg:text-2xl">
            <h2 className="mr-3">Liquidity overview</h2>
            <EnvironmentNetworkSwitch />
          </div>
          <div className="mt-1">
            <span className="text-dark-700 text-sm md:test-base">
              The current liquidity of each token available on Quantum. For
              proof of backing,
            </span>
            <a
              href={getPOBUrl()}
              target="_blank"
              rel="noreferrer"
              className="text-dark-1000 ml-1 font-semibold text-sm md:test-base"
              data-testid="POB.Url"
            >
              view here
            </a>
          </div>
        </div>
        <OverviewList balances={balances} />
      </div>
    </section>
  );
}

export async function getServerSideProps({ query }) {
  let isBridgeUp = true;
  let defaultBalances = {};
  try {
    const res = await fetch(
      `https://wallet.defichain.com/api/v0/bridge/status`,
    );
    const [data, statusCode] = await Promise.all([res.json(), res.status]);
    if (statusCode === 200) {
      isBridgeUp = data?.isUp;
    } else {
      Logging.error("Get bridge status API error.");
    }
    // fetch balance
    const baseUrl =
      BASE_URLS[query.network] ?? BASE_URLS[EnvironmentNetwork.MainNet];
    const balancesRes = await fetch(`${baseUrl}/balances`);
    const [balance, balancesSC] = await Promise.all([
      balancesRes.json(),
      balancesRes.status,
    ]);
    if (balancesSC === 200) {
      defaultBalances = balance;
    } else {
      Logging.error("Get bridge balance API error.");
    }
    return {
      props: { isBridgeUp, defaultBalances }, // will be passed to the page component as props
    };
  } catch (e) {
    Logging.error(`${e}`);
    return {
      props: { isBridgeUp, defaultBalances }, // will be passed to the page component as props
    };
  }
}
