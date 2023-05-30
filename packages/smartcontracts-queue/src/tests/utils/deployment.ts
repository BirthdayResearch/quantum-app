import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers } from 'hardhat';

import { BridgeQueue, BridgeQueue__factory, TestToken } from '../../generated';

export async function deployContracts(): Promise<BridgeQueueDeploymentResult> {
  const accounts = await ethers.provider.listAccounts();
  const defaultAdminSigner = await ethers.getSigner(accounts[0]);
  const coldWalletSigner = await ethers.getSigner(accounts[1]);
  const communityWalletSigner = await ethers.getSigner(accounts[2]);
  const arbitrarySigner = await ethers.getSigner(accounts[3]);
  const BridgeQueueFactory = await ethers.getContractFactory('BridgeQueue');
  const bridgeQueue = await BridgeQueueFactory.deploy();
  await bridgeQueue.deployed();
  const BridgeQueueProxyFactory = await ethers.getContractFactory('BridgeQueueProxy');
  const ERC20 = await ethers.getContractFactory('TestToken');
  const testToken3 = await ERC20.deploy('Test3', 'T3');
  const testToken4 = await ERC20.deploy('Test4', 'T4');
  // deployment arguments for the Proxy contract
  const encodedData = BridgeQueue__factory.createInterface().encodeFunctionData('initialize', [
    // default admin address
    accounts[0],
    // cold wallet
    accounts[1],
    // 0%
    0,
    // communityWalletAddress
    accounts[2],
    // supported tokens
    [testToken3.address, testToken4.address],
  ]);
  const bridgeProxy = await BridgeQueueProxyFactory.deploy(bridgeQueue.address, encodedData);
  await bridgeProxy.deployed();
  const proxyBridge = BridgeQueueFactory.attach(bridgeProxy.address);
  // Deploying ERC20 tokens
  const testToken = await ERC20.deploy('Test', 'T');
  const testToken2 = await ERC20.deploy('Test2', 'T2');

  return {
    proxyBridge,
    bridgeImplementation: bridgeQueue,
    testToken,
    testToken2,
    defaultAdminSigner,
    coldWalletSigner,
    communityWalletSigner,
    arbitrarySigner,
    testToken3,
    testToken4,
  };
}

interface BridgeQueueDeploymentResult {
  proxyBridge: BridgeQueue;
  bridgeImplementation: BridgeQueue;
  testToken: TestToken;
  testToken2: TestToken;
  defaultAdminSigner: SignerWithAddress;
  coldWalletSigner: SignerWithAddress;
  communityWalletSigner: SignerWithAddress;
  arbitrarySigner: SignerWithAddress;
  testToken3: TestToken;
  testToken4: TestToken;
}
