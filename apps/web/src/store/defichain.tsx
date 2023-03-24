import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { FetchArgs } from "@reduxjs/toolkit/dist/query/fetchBaseQuery";
import { AddressDetails, BridgeSettings, BridgeVersion } from "types";
import { HttpStatusCode } from "axios";
import type { RootState } from "@store/reducers/rootReducer";

const staggeredBaseQueryWithBailOut = retry(
  async (args: string | FetchArgs, api, extraOptions) => {
    const result = await fetchBaseQuery({
      prepareHeaders: (headers, { getState }) => {
        const { version } = getState() as RootState;
        headers.set("app-version", version);
      },
    })(args, api, extraOptions);
    // bail out of re-tries if TooManyRequests,
    // because we know successive re-retries would be redundant
    if (result.error?.status === HttpStatusCode.TooManyRequests) {
      retry.fail(result.error);
    }
    return result;
  },
  {
    maxRetries: 0,
  }
);

export const PATH_DFC_WALLET = "defichain/wallet";
export const PATH_ETHEREUM = "ethereum";

// eslint-disable-next-line import/prefer-default-export
export const bridgeApi = createApi({
  reducerPath: "defichain",
  baseQuery: staggeredBaseQueryWithBailOut,
  endpoints: (builder) => ({
    generateAddress: builder.mutation<AddressDetails, any>({
      query: ({ baseUrl, refundAddress }) => ({
        url: `${baseUrl}/${PATH_DFC_WALLET}/address/generate`,
        params: { refundAddress },
        method: "GET",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=UTF-8",
        },
      }),
      extraOptions: { maxRetries: 3 },
    }),
    verify: builder.query<
      any,
      {
        baseUrl?: string;
        address: string;
        ethReceiverAddress: string;
        tokenAddress: string;
        amount: string;
        symbol: string;
      }
    >({
      query: ({
        baseUrl,
        address,
        ethReceiverAddress,
        tokenAddress,
        amount,
        symbol,
      }) => ({
        url: `${baseUrl}/${PATH_DFC_WALLET}/verify`,
        method: "POST",
        body: {
          address,
          ethReceiverAddress,
          tokenAddress,
          amount,
          symbol,
        },
      }),
      extraOptions: { maxRetries: 0 },
    }),
    getAddressDetail: builder.mutation<AddressDetails, any>({
      query: ({ baseUrl, address }) => ({
        url: `${baseUrl}/${PATH_DFC_WALLET}/address/${address}`,
        method: "GET",
      }),
      extraOptions: { maxRetries: 1 },
    }),
    confirmEthTxn: builder.mutation<
      { numberOfConfirmations: string; isConfirmed: boolean },
      any
    >({
      query: ({ baseUrl, txnHash }) => ({
        url: `${baseUrl}/${PATH_ETHEREUM}/handleTransaction`,
        body: {
          transactionHash: txnHash,
        },
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=UTF-8",
        },
      }),
      extraOptions: { maxRetries: 0 },
    }),
    bridgeStatus: builder.query<{ isUp: boolean }, any>({
      query: ({ baseUrl }) => ({
        url: `${baseUrl}/bridge/status`,
        method: "GET",
        headers: {
          "Access-Control-Allow-Origin": "*",
          mode: "no-cors",
        },
      }),
    }),
    bridgeVersion: builder.query<BridgeVersion, any>({
      query: ({ baseUrl }) => ({
        url: `${baseUrl}/version`,
        method: "GET",
      }),
    }),
    bridgeSettings: builder.query<BridgeSettings, any>({
      query: ({ baseUrl }) => ({
        url: `${baseUrl}/settings`,
        method: "GET",
      }),
    }),
    allocateDfcFund: builder.mutation<
      {
        transactionHash: string;
        isConfirmed: boolean;
        numberOfConfirmationsDfc: string;
      },
      any
    >({
      query: ({ baseUrl, txnHash }) => ({
        url: `${baseUrl}/${PATH_ETHEREUM}/allocateDFCFund`,
        body: {
          transactionHash: txnHash,
        },
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json; charset=UTF-8",
        },
      }),
      extraOptions: { maxRetries: 0 },
    }),
    balanceEvm: builder.mutation<string, any>({
      query: ({ baseUrl, tokenSymbol }) => ({
        url: `${baseUrl}/${PATH_ETHEREUM}/balance/${tokenSymbol}`,
        method: "GET",
      }),
      extraOptions: { maxRetries: 1 },
    }),
    balanceDfc: builder.mutation<string, any>({
      query: ({ baseUrl, tokenSymbol }) => ({
        url: `${baseUrl}/${PATH_DFC_WALLET}/balance/${tokenSymbol}`,
        method: "GET",
      }),
      extraOptions: { maxRetries: 1 },
    }),
  }),
});
