import Head from "next/head";
import React, { PropsWithChildren, useEffect, useState } from "react";
import { Provider } from "react-redux";
import {
  appName,
  keywords,
  longDescription,
  shortDescription,
  siteTitle,
  website,
} from "@components/siteInfo";
import { configureChains, createClient, WagmiConfig } from "wagmi";
import { goerli, hardhat, localhost, mainnet } from "wagmi/chains";
import { MetaMaskConnector } from "wagmi/connectors/metaMask";
import { jsonRpcProvider } from "wagmi/providers/jsonRpc";
import { publicProvider } from "wagmi/providers/public";
import { ConnectKitProvider, getDefaultClient } from "connectkit";
import { getInitialTheme, ThemeProvider } from "@contexts/ThemeProvider";
import { NetworkEnvironmentProvider } from "@contexts/NetworkEnvironmentContext";
import { NetworkProvider } from "@contexts/NetworkContext";
import { DeFiScanProvider } from "@contexts/DeFiScanContext";
import { ContractProvider } from "@contexts/ContractContext";
import {
  NetworkProvider as WhaleNetworkProvider,
  WhaleProvider,
} from "@waveshq/walletkit-ui";
import SecuredStoreAPI from "@api/secure-storage";
import Logging from "@api/logging";
import { StorageProvider } from "@contexts/StorageContext";
import { store } from "@store/store";
import ScreenContainer from "../components/ScreenContainer";
import { ETHEREUM_MAINNET_ID } from "../constants";
import { MAINNET_CONFIG, TESTNET_CONFIG } from "../config";

const metamask = new MetaMaskConnector({
  chains: [mainnet, goerli, localhost, hardhat],
});

const { chains } = configureChains(
  [localhost, hardhat, goerli, mainnet],
  [
    jsonRpcProvider({
      rpc: (chain) => {
        const isMainNet = chain.id === ETHEREUM_MAINNET_ID;
        const config = isMainNet ? MAINNET_CONFIG : TESTNET_CONFIG;
        return {
          http: (config.EthereumRpcUrl || chain.rpcUrls.default) as string,
        };
      },
    }),
    publicProvider(),
  ]
);

const client = createClient(
  getDefaultClient({
    autoConnect: true,
    chains,
    appName,
    connectors: [metamask],
  })
);

function Base({
  children,
  isBridgeUp,
}: PropsWithChildren<any>): JSX.Element | null {
  const initialTheme = getInitialTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-dark-00 antialiased">
      <Head>
        <base href="/" />
        <meta name="application-name" content={appName} />
        <meta charSet="UTF-8" />
        <title key="title">{siteTitle}</title>
        <meta key="description" name="description" content={longDescription} />
        <meta key="keywords" name="keywords" content={keywords} />
        <meta key="robots" name="robots" content="follow,index" />
        <meta name="googlebot" content="index,follow" />
        <meta name="google" content="notranslate" />
        <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, shrink-to-fit=no, viewport-fit=cover"
        />
        <meta
          key="apple-mobile-web-app-capable"
          name="apple-mobile-web-app-capable"
          content="yes"
        />
        <meta name="theme-color" content="#5B10FF" />

        <meta name="og:locale" content="en_SG" />
        <meta name="og:title" content={siteTitle} />
        <meta name="og:image" content="/bridge_share.png" />
        <meta name="og:site_name" content={appName} />
        <meta name="og:url" content={website} />
        <meta name="og:description" content={shortDescription} />

        <meta name="twitter:card" content={shortDescription} />
        <meta name="twitter:site" content={website} />
        <meta name="twitter:creator" content="@birthdaydev" />
        <meta name="twitter:title" content={siteTitle} />
        <meta name="twitter:description" content={shortDescription} />
        <meta
          name="twitter:image"
          content="https://quantumbridge.app/bridge_share.png"
        />
        <meta name="twitter:image:alt" content={siteTitle} />
        <meta name="twitter:card" content="summary_large_image" />

        <link rel="icon" href="/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        {process.env.NODE_ENV !== "development" && (
          <script
            nonce="raygun"
            async
            defer
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: `
              !function(a,b,c,d,e,f,g,h){a.RaygunObject=e,a[e]=a[e]||function(){
              (a[e].o=a[e].o||[]).push(arguments)},f=b.createElement(c),g=b.getElementsByTagName(c)[0],
              f.async=1,f.src=d,g.parentNode.insertBefore(f,g),h=a.onerror,a.onerror=function(b,c,d,f,g){
              h&&h(b,c,d,f,g),g||(g=new Error(b)),a[e].q=a[e].q||[],a[e].q.push({
              e:g})}}(window,document,"script","//cdn.raygun.io/raygun4js/raygun.min.js","rg4js");

              rg4js('apiKey', 'xgLWC9Tpzmeo88rziVxnHA');
              rg4js('enableCrashReporting', true);`,
            }}
          />
        )}
      </Head>

      <Provider store={store}>
        <WagmiConfig client={client}>
          <ConnectKitProvider mode="dark" options={{ initialChainId: 0 }}>
            {mounted && (
              <NetworkProvider>
                <WhaleNetworkProvider api={SecuredStoreAPI} logger={Logging}>
                  <WhaleProvider>
                    <NetworkEnvironmentProvider>
                      <DeFiScanProvider>
                        <ContractProvider>
                          <ThemeProvider theme={initialTheme}>
                            <StorageProvider>
                              <ScreenContainer isBridgeUp={isBridgeUp}>
                                {children}
                              </ScreenContainer>
                            </StorageProvider>
                          </ThemeProvider>
                        </ContractProvider>
                      </DeFiScanProvider>
                    </NetworkEnvironmentProvider>
                  </WhaleProvider>
                </WhaleNetworkProvider>
              </NetworkProvider>
            )}
          </ConnectKitProvider>
        </WagmiConfig>
      </Provider>
    </div>
  );
}

export default Base;
