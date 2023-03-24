import { EnvironmentNetwork, getEnvironment } from "@waveshq/walletkit-core";
import secureLocalStorage from "react-secure-storage";

/**
 * @param network {EnvironmentNetwork} with set with 'environment' prefixed
 */
async function setNetwork(network: EnvironmentNetwork): Promise<void> {
  const env = getEnvironment(process.env.NODE_ENV);

  if (!env.networks.includes(network)) {
    throw new Error("network is not part of environment");
  }

  await secureLocalStorage.setItem(`${env.name}.NETWORK`, network);
}

/**
 * @return EnvironmentNetwork if invalid, will be set to `networks[0]`
 */
async function getNetwork(): Promise<EnvironmentNetwork> {
  const env = getEnvironment(process.env.NODE_ENV);
  const network = await secureLocalStorage.getItem(`${env.name}.NETWORK`);

  if ((env.networks as any[]).includes(network)) {
    return network as EnvironmentNetwork;
  }

  await setNetwork(env.networks[0]);
  return env.networks[0];
}

const SecuredStoreAPI = {
  getNetwork,
  setNetwork,
};

export default SecuredStoreAPI;
