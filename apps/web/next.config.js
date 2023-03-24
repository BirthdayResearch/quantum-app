const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      `default-src 'none';` +
      `base-uri 'self';` +
      `child-src 'self' app.netlify.com;` +
      `form-action 'none';` +
      `frame-ancestors 'none';` +
      `img-src 'self' images.prismic.io data:;` +
      `media-src 'self';` +
      `object-src 'none';` +
      `script-src 'self' app.netlify.com netlify-cdp-loader.netlify.app *.raygun.io *.googletagmanager.com 'nonce-raygun' ${
        process.env.NODE_ENV === "development" ? `'unsafe-eval'` : ""
      };` +
      `style-src 'self' fonts.googleapis.com 'unsafe-inline';` +
      `font-src fonts.gstatic.com;` +
      `connect-src 'self' cloudflare-eth.com eth-goerli.g.alchemy.com *.raygun.io rpc.ankr.com mainnet.infura.io ocean.defichain.com testnet.ocean.jellyfishsdk.com wallet.defichain.com api.quantumbridge.app testnet.api.quantumbridge.app *.google-analytics.com ${
        process.env.NODE_ENV === "development"
          ? `localhost:* 127.0.0.1:* ws://localhost:3000/_next/webpack-hmr`
          : ""
      } https://fonts.gstatic.com https://fonts.googleapis.com;` +
      `prefetch-src 'self';`,
  },
  {
    key: "Referrer-Policy",
    value: "same-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["en"],
    defaultLocale: "en",
  },
  reactStrictMode: true,
  swcMinify: true,
  images: {
    deviceSizes: [360, 768, 1440, 1920, 2048, 3840],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
