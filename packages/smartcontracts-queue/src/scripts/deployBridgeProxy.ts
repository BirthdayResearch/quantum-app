import { ethers } from 'hardhat';

import { BridgeQueue__factory, BridgeQueueProxy } from '../generated';
import { verify } from './utils/verify';

export async function deployBridgeProxy({
  timelockContractAddress,
  coldWalletAddress,
  fee,
  communityWalletAddress,
  bridgeQueueAddress,
  supportedTokenAddresses,
}: InputsForInitialization): Promise<BridgeQueueProxy> {
  const bridgeProxyContract = await ethers.getContractFactory('BridgeQueueProxy');
  const encodedData = BridgeQueue__factory.createInterface().encodeFunctionData('initialize', [
    timelockContractAddress,
    coldWalletAddress,
    fee,
    communityWalletAddress,
    supportedTokenAddresses,
  ]);
  const bridgeQueueProxy = await bridgeProxyContract.deploy(bridgeQueueAddress, encodedData);
  await bridgeQueueProxy.deployTransaction.wait(6);
  console.log('Proxy Address: ', bridgeQueueProxy.address);
  await verify({
    contractAddress: bridgeQueueProxy.address,
    args: [bridgeQueueAddress, encodedData],
    contract: 'contracts/BridgeQueueProxy.sol:BridgeQueueProxy',
  });
  return bridgeQueueProxy;
}

interface InputsForInitialization {
  timelockContractAddress: string;
  coldWalletAddress: string;
  fee: string;
  communityWalletAddress: string;
  bridgeQueueAddress: string;
  supportedTokenAddresses: string[];
}
