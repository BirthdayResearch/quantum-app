import { BaseQueryFn } from "@reduxjs/toolkit/query";
import { UseQuery } from "@reduxjs/toolkit/dist/query/react/buildHooks";
import { QueryDefinition, skipToken } from "@reduxjs/toolkit/dist/query/react";
import { useNetworkEnvironmentContext } from "@contexts/NetworkEnvironmentContext";
import BASE_URLS from "../config/networkUrl";

function isSkipToken(arg): arg is typeof skipToken {
  return typeof arg === typeof skipToken;
}

/**
 * Wrapper for UseQuery function to inject NetworkEnvironmentContext and pass in `baseUrl` based on the current network
 * @param query
 * @param args
 */
function useWrappedQuery<U, V extends BaseQueryFn, W>(
  query: UseQuery<QueryDefinition<U, V, never, W, string>>,
  args: Parameters<UseQuery<QueryDefinition<U, V, never, W, string>>>[0],
): ReturnType<UseQuery<QueryDefinition<U, V, never, W, string>>> {
  const { networkEnv } = useNetworkEnvironmentContext();

  if (!isSkipToken(args)) {
    return query({ baseUrl: BASE_URLS[networkEnv], ...args });
  }
  return query(args);
}

export default useWrappedQuery;
