import { ethers } from 'hardhat';

import { BridgeProxy, BridgeV1__factory } from '../generated';
import { verify } from './utils/verify';

// Tx fee should be 0
const TRANSACTION_FEE = 0;

export async function deployBridgeProxy({
  adminAddress,
  withdrawAddress,
  relayerAddress,
  bridgeV1Address,
  txFeeAddress,
  flushReceiveAddress,
}: InputsForInitialization): Promise<BridgeProxy> {
  const bridgeProxyContract = await ethers.getContractFactory('BridgeProxy');
  const encodedData = BridgeV1__factory.createInterface().encodeFunctionData('initialize', [
    // admin address, or timelock contract address
    adminAddress,
    // withdraw address
    withdrawAddress,
    // relayer address
    relayerAddress,
    // community wallet address
    txFeeAddress,
    TRANSACTION_FEE,
    flushReceiveAddress,
  ]);
  const bridgeProxy = await bridgeProxyContract.deploy(bridgeV1Address, encodedData);
  await bridgeProxy.deployed();
  console.log('Proxy Address: ', bridgeProxy.address);
  console.log('Verifying...');
  await verify({ contractAddress: bridgeProxy.address, args: [bridgeV1Address, encodedData] });
  return bridgeProxy;
}

interface InputsForInitialization {
  adminAddress: string;
  withdrawAddress: string;
  relayerAddress: string;
  bridgeV1Address: string;
  txFeeAddress: string;
  flushReceiveAddress: string;
}
