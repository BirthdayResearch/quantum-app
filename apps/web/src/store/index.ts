import useWrappedMutation from "@hooks/useWrappedMutation";
import useWrappedLazyQuery from "@hooks/useWrappedLazyQuery";
import useWrappedQuery from "@hooks/useWrappedQuery";

import { bridgeApi } from "./defichain";

const useGenerateAddressMutation = () =>
  useWrappedMutation(bridgeApi.useGenerateAddressMutation);
const useLazyVerifyQuery = () =>
  useWrappedLazyQuery(bridgeApi.useLazyVerifyQuery);
const useGetAddressDetailMutation = () =>
  useWrappedMutation(bridgeApi.useGetAddressDetailMutation);
const useConfirmEthTxnMutation = () =>
  useWrappedMutation(bridgeApi.useConfirmEthTxnMutation);
const useAllocateDfcFundMutation = () =>
  useWrappedMutation(bridgeApi.useAllocateDfcFundMutation);
const useBalanceEvmMutation = () =>
  useWrappedMutation(bridgeApi.useBalanceEvmMutation);
const useBalanceDfcMutation = () =>
  useWrappedMutation(bridgeApi.useBalanceDfcMutation);
const useLazyBridgeStatusQuery = () =>
  useWrappedLazyQuery(bridgeApi.useLazyBridgeStatusQuery, true);
const useBridgeVersionQuery = (args?: Parameters<typeof useWrappedQuery>[1]) =>
  useWrappedQuery(bridgeApi.useBridgeVersionQuery, args);
const useLazyBridgeSettingsQuery = () =>
  useWrappedLazyQuery(bridgeApi.useLazyBridgeSettingsQuery);

export {
  useGenerateAddressMutation,
  useLazyVerifyQuery,
  useGetAddressDetailMutation,
  useConfirmEthTxnMutation,
  useAllocateDfcFundMutation,
  useBalanceEvmMutation,
  useBalanceDfcMutation,
  useLazyBridgeStatusQuery,
  useBridgeVersionQuery,
  useLazyBridgeSettingsQuery,
  bridgeApi,
};
