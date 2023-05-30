import { constants } from 'ethers';

import { bridgeImplementation } from './deployBridgeImplementation';
import { deployBridgeProxy } from './deployBridgeProxy';

const TIMELOCK_CONTRACT_ADDRESS = '';
const COLD_WALLET_ADDRESS = '';
const FEE = '';
const COMMUNITY_WALLET_ADDRESS = '';
// mainnet addresses
const usdc = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';
const usdt = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const euroc = '0x1abaea1f7c830bd89acc67ec4af516284b1bc33c';
const wbtc = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599';
const eth = constants.AddressZero;
const dfi = '0x8fc8f8269ebca376d046ce292dc7eac40c8d358a';
const SUPPORTED_TOKEN_ADDRESSES: string[] = [usdc, usdt, euroc, wbtc, eth, dfi];

// for goerli deployment
// npx hardhat run --network goerli ./scripts/mainnetDeployment.ts --config hardhat.config.ts
// for mainnet deployment
// npx hardhat run --network mainnet ./scripts/mainnetDeployment.ts --config hardhat.config.ts
async function main() {
  const bridgeQueue = await bridgeImplementation();
  await deployBridgeProxy({
    timelockContractAddress: TIMELOCK_CONTRACT_ADDRESS,
    coldWalletAddress: COLD_WALLET_ADDRESS,
    fee: FEE,
    communityWalletAddress: COMMUNITY_WALLET_ADDRESS,
    bridgeQueueAddress: bridgeQueue.address,
    supportedTokenAddresses: SUPPORTED_TOKEN_ADDRESSES,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
