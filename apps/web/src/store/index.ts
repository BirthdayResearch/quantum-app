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
const useBridgeBalancesMutation = () =>
  useWrappedMutation(bridgeApi.useBridgeBalancesMutation);
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
const useLazyBridgeAnnouncements = () =>
  useWrappedLazyQuery(bridgeApi.useLazyBridgeAnnouncementsQuery, true);
const useQueueTransactionMutation = () =>
  useWrappedMutation(bridgeApi.useQueueTransactionMutation);
const useVerifyEthQueueTxnMutation = () =>
  useWrappedMutation(bridgeApi.useVerifyEthQueueTxnMutation);
const useGetQueueTransactionQuery = () =>
  useWrappedLazyQuery(bridgeApi.useLazyGetQueueTransactionQuery);
const useLazyGetEVMTxnDetailsQuery = () =>
  useWrappedLazyQuery(bridgeApi.useLazyGetEVMTxnDetailsQuery);
const useRefundMutation = () => useWrappedMutation(bridgeApi.useRefundMutation);

export {
  useGenerateAddressMutation,
  useLazyVerifyQuery,
  useGetAddressDetailMutation,
  useConfirmEthTxnMutation,
  useAllocateDfcFundMutation,
  useBridgeBalancesMutation,
  useBalanceEvmMutation,
  useBalanceDfcMutation,
  useLazyBridgeStatusQuery,
  useBridgeVersionQuery,
  useLazyBridgeSettingsQuery,
  useLazyBridgeAnnouncements,
  useQueueTransactionMutation,
  useVerifyEthQueueTxnMutation,
  useGetQueueTransactionQuery,
  useLazyGetEVMTxnDetailsQuery,
  useRefundMutation,
  bridgeApi,
};
