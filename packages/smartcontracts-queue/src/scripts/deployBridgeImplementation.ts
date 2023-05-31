import { ethers } from 'hardhat';

import { BridgeQueue } from '../generated';
import { verify } from './utils/verify';

export async function bridgeImplementation(): Promise<BridgeQueue> {
  const BridgeQueueFactory = await ethers.getContractFactory('BridgeQueue');
  const bridgeQueue = await BridgeQueueFactory.deploy();
  await bridgeQueue.deployTransaction.wait(6);
  console.log('Bridge Queue address is ', bridgeQueue.address);
  // This will verify the contract
  await verify({ contractAddress: bridgeQueue.address });
  return bridgeQueue;
}
