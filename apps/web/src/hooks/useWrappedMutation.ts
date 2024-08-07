import { BaseQueryFn, MutationDefinition } from "@reduxjs/toolkit/query";
import { UseMutation } from "@reduxjs/toolkit/dist/query/react/buildHooks";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import BASE_URLS from "../config/networkUrl";

/**
 * Wrapper for UseMutation function to inject NetworkEnvironmentContext and pass in `baseUrl` based on the current network
 * @param mutation
 */
const useWrappedMutation = <U, V extends BaseQueryFn, W>(
  mutation: UseMutation<MutationDefinition<U, V, never, W, string>>,
): ReturnType<UseMutation<MutationDefinition<U, V, never, W, string>>> => {
  const [mutate, status] = mutation();
  const { networkEnv } = useNetworkEnvironmentContext();

  const mutationWrapper = (args) =>
    mutate({ baseUrl: BASE_URLS[networkEnv], ...args });
  return [mutationWrapper, status];
};

export default useWrappedMutation;
