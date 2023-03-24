import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeV2TestNet__factory } from '../generated';
import { deployContracts } from './testUtils/deployment';
import { toWei } from './testUtils/mathUtils';

describe('Proxy behaviour', () => {
  const eip712Types = {
    CLAIM: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
    ],
  };

  it("Upgrade and test contract's functionality and storage slots", async () => {
    const { proxyBridge, testToken, defaultAdminSigner, withdrawSigner, communityAddress } = await loadFixture(
      deployContracts,
    );
    // BridgeV1 should have version 1
    expect(await proxyBridge.version()).to.equal('1');
    // Supporting testToken with hard cap of 15
    await proxyBridge.addSupportedTokens(testToken.address, toWei('15'));
    // Minting 100 testToken to ProxyContract
    await testToken.mint(proxyBridge.address, toWei('100'));
    // ---------------------------Claiming fund on bridge V1-------------------------
    const domainDataV1 = {
      name: 'QUANTUM_BRIDGE',
      version: '1',
      chainId: 1337,
      verifyingContract: proxyBridge.address,
    };
    const eip712DataV1 = {
      to: defaultAdminSigner.address,
      amount: toWei('10'),
      nonce: 0,
      deadline: ethers.constants.MaxUint256,
      tokenAddress: testToken.address,
    };

    const signature = await defaultAdminSigner._signTypedData(domainDataV1, eip712Types, eip712DataV1);
    // Checking Balance before claiming fund, should be 0
    expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(0);
    await proxyBridge.claimFund(
      defaultAdminSigner.address,
      toWei('10'),
      0,
      ethers.constants.MaxUint256,
      testToken.address,
      signature,
    );
    // Checking Balance after claiming fund, should be 10
    expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(toWei('10'));
    // ---------------------------END-----Claiming fund on bridge V1-------------------------
    // Encoded BridgeV2TestNet data
    const BridgeUpgradeable = await ethers.getContractFactory('BridgeV2TestNet');
    const bridgeUpgradeable = await BridgeUpgradeable.deploy();
    await bridgeUpgradeable.deployed();
    const encodedData = BridgeV2TestNet__factory.createInterface().encodeFunctionData('initialize', [
      // Contract version
      2,
    ]);

    // Upgrading the Proxy contract
    await proxyBridge.upgradeToAndCall(bridgeUpgradeable.address, encodedData);
    const bridgeV2 = BridgeUpgradeable.attach(proxyBridge.address);
    expect(await bridgeV2.version()).to.equal('2');
    // Deployment tests
    // Check if the accounts[0] has the admin role.
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(await bridgeV2.hasRole(DEFAULT_ADMIN_ROLE, defaultAdminSigner.address)).to.equal(true);
    // Check if the relayer address is same as accounts[0]
    expect(defaultAdminSigner.address).to.be.equal(await bridgeV2.relayerAddress());
    // Check if whether withdrawSigner still has WITHDRAW_ROLE
    const WITHDRAW_ROLE = ethers.utils.solidityKeccak256(['string'], ['WITHDRAW_ROLE']);
    expect(await bridgeV2.hasRole(WITHDRAW_ROLE, withdrawSigner.address)).to.equal(true);
    expect(await bridgeV2.communityWallet()).to.equal(communityAddress);
    // Supporting testToken with hard cap of 15
    expect(await bridgeV2.isSupported(testToken.address)).to.equal(true);

    // ---------------------------Claiming fund on bridge V2-------------------------
    const domainDataV2 = {
      name: 'QUANTUM_BRIDGE',
      version: '2',
      chainId: 1337,
      verifyingContract: bridgeV2.address,
    };

    const eip712DataV2 = {
      to: defaultAdminSigner.address,
      amount: toWei('10'),
      nonce: 1,
      deadline: ethers.constants.MaxUint256,
      tokenAddress: testToken.address,
    };

    const signatureV2 = await defaultAdminSigner._signTypedData(domainDataV2, eip712Types, eip712DataV2);
    // Checking Balance before claiming fund, should be 0
    expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(toWei('10'));
    await bridgeV2.claimFund(
      defaultAdminSigner.address,
      toWei('10'),
      1,
      ethers.constants.MaxUint256,
      testToken.address,
      signatureV2,
    );
    // Checking Balance after claiming fund, should be 10
    expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(toWei('20'));
    // ---------------------------END-----Claiming fund on bridge V2-------------------------
  });
});
