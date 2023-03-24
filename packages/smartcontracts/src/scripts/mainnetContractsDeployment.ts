import { ethers } from 'hardhat';

import { bridgeImplementation } from './deployBridgeImplementation';
import { deployBridgeProxy } from './deployBridgeProxy';
import { deployTimelockController } from './deployTimelockController';

require('dotenv').config({
  path: './.env',
});

// when deploying, replace the following values with the correct ones
const minDelay = 259200; // 3 days
const TIMELOCK_ADMIN_ADDRESS = ''; // Multi sig wallet
const BRIDGE_WITHDRAW_ADDRESS = ''; // Multi sig wallet
const RELAYER_ADDRESS = '';
const TX_FEE_ADDRESS = '';
const FLUSH_ADDRESS = '';

// Run this script to deploy all contracts on mainnet.
// npx hardhat run --network mainnet ./scripts/mainnetContractsDeployment.ts

// Run this script to deploy all contracts on Goerli testnet.
// npx hardhat run --network goerli ./scripts/mainnetContractsDeployment.ts

async function main() {
  const timelockController = await deployTimelockController({
    minDelay,
    proposers: [TIMELOCK_ADMIN_ADDRESS],
    executors: [TIMELOCK_ADMIN_ADDRESS],
    admin: ethers.constants.AddressZero,
  });
  const bridgeV1 = await bridgeImplementation();
  await deployBridgeProxy({
    adminAddress: timelockController.address,
    withdrawAddress: BRIDGE_WITHDRAW_ADDRESS,
    relayerAddress: RELAYER_ADDRESS,
    bridgeV1Address: bridgeV1.address,
    txFeeAddress: TX_FEE_ADDRESS,
    flushReceiveAddress: FLUSH_ADDRESS,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
