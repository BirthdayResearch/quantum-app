// import { EnvironmentNetwork } from "@waveshq/walletkit-core";

enum EnvironmentNetwork {
  LocalPlayground = "Local",
  MainNet = "MainNet",
  TestNet = "TestNet",
  DevNet = "DevNet",
}

const BASE_URLS: { [key in EnvironmentNetwork]: string } = {
  [EnvironmentNetwork.LocalPlayground]: "http://localhost:5741",
  // [EnvironmentNetwork.RemotePlayground]:
  //   "https://dihwwizbqe.eu-west-1.awsapprunner.com",
  [EnvironmentNetwork.TestNet]: "https://testnet.api.quantumbridge.app",
  [EnvironmentNetwork.DevNet]: "http://localhost:5741",
  [EnvironmentNetwork.MainNet]: "https://api.quantumbridge.app",
};

export const DEFICHAIN_WALLET_URL = "https://wallet.defichain.com/api/v0";

export default BASE_URLS;
