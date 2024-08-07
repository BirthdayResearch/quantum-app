import { networks } from "@contexts/NetworkContext";
import { Network } from "types";

export default function mapTokenToNetworkName(
  network: Network,
  symbol?: string,
): string | undefined {
  if (symbol === undefined) {
    return undefined;
  }

  const [ethNetwork, dfcNetwork] = networks;
  const networkToSearch =
    network === Network.Ethereum ? ethNetwork : dfcNetwork;
  const symbolToDisplay = networkToSearch.tokens.find(
    (option) => option.tokenA.symbol === symbol,
  )?.tokenA.name;

  return symbolToDisplay;
}
