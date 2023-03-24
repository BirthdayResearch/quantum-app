import "../styles/globals.scss";
import NextNProgress from "nextjs-progressbar";
import React from "react";
import Script from "next/script";
import Base from "../layouts/Base";

// @ts-ignore
export default function BridgeApp({ Component, pageProps }): JSX.Element {
  return (
    <Base {...pageProps}>
      <NextNProgress
        startPosition={0.3}
        stopDelayMs={200}
        showOnShallow
        color="#5B10FF"
        height={4}
        options={{ showSpinner: false }}
      />
      <Script
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-ignore
          window.dataLayer = window.dataLayer || [];
          function gtag() {
            // @ts-ignore
            // eslint-disable-next-line prefer-rest-params
            window.dataLayer.push(arguments);
          }
          // @ts-ignore
          gtag("js", new Date());
          // @ts-ignore
          gtag("config", "G-CNVHG8WSHW");
        }}
        src="https://www.googletagmanager.com/gtag/js?id=G-CNVHG8WSHW"
      />
      <Component {...pageProps} />
    </Base>
  );
}
