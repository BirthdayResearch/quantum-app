import { ethers } from 'hardhat';

import { BridgeV1 } from '../generated';
import { verify } from './utils/verify';

// npx hardhat run --network goerli ./scripts/deployBridgeImplementation.ts
export async function bridgeImplementation(): Promise<BridgeV1> {
  const BridgeV1Contract = await ethers.getContractFactory('BridgeV1');
  const bridgeV1 = await BridgeV1Contract.deploy();
  await bridgeV1.deployed();
  console.log('Bridge V1 address is ', bridgeV1.address);
  console.log('Verifying...');
  // This will verify the contract
  await verify({ contractAddress: bridgeV1.address });
  return bridgeV1;
}
