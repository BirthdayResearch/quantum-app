import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeV1__factory, TestToken__factory } from '../generated';
import { mintAndApproveTestTokensLocal } from '../scripts/localContractsDeployment';
import { toWei } from './testUtils/mathUtils';

describe('SetupLocalTestTask', () => {
  it('should set up the expected local testnet state', async () => {
    // Given that the setupLocalTest task is run
    const { usdtContract, usdcContract, bridgeImplementationContract } = await mintAndApproveTestTokensLocal();
    // suppressing type error - method is actually properly typed
    // @ts-ignore
    const [adminSigner, withdrawSigner] = await ethers.getSigners();
    const adminAddress = adminSigner.address;

    const musdtContract = TestToken__factory.connect(usdtContract.address, adminSigner);
    const musdtAddress = musdtContract.address;
    const musdcContract = TestToken__factory.connect(usdcContract.address, adminSigner);
    const musdcAddress = musdcContract.address;
    // behind proxy, so we need to use the proxy address
    const proxyBridge = BridgeV1__factory.connect(bridgeImplementationContract.address, adminSigner);

    // When checking the ERC20 balances of the EOA
    expect(await musdtContract.balanceOf(adminAddress)).to.equal(toWei('100000'));
    expect(await musdcContract.balanceOf(adminAddress)).to.equal(toWei('100000'));
    // Check if the accounts[0] has the admin role.
    const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
    expect(await proxyBridge.hasRole(DEFAULT_ADMIN_ROLE, adminAddress)).to.equal(true);
    // Check if the relayer address is same as accounts[0]
    expect(adminAddress).to.be.equal(await proxyBridge.relayerAddress());
    // Check if the accounts[1] has the WITHDRAW_ROLE.
    const WITHDRAW_ROLE = ethers.utils.solidityKeccak256(['string'], ['WITHDRAW_ROLE']);
    expect(await proxyBridge.hasRole(WITHDRAW_ROLE, withdrawSigner.address)).to.equal(true);

    // Checking that MUSDT is supported on the bridge
    expect(await proxyBridge.isSupported(musdtAddress)).to.equal(true);
    // Checking the hard cap on MUSDT token
    expect(await proxyBridge.tokenCap(musdtAddress)).to.be.equal(ethers.constants.MaxUint256);
    // When checking that MUSDC is supported on the bridge
    // Then the token should be supported
    expect(await proxyBridge.isSupported(musdcAddress)).to.equal(true);
    expect(await proxyBridge.tokenCap(musdcAddress)).to.be.equal(ethers.constants.MaxUint256);

    // Before bridging, approval needed for the proxy contracts. `approve()` is being called for both mUsdc and mUsdt in `mintAndApproveTestTokensLocal()`
    // Then the call should not revert
    await proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, musdtAddress, toWei('1'));
    // And the EOA's balance of MUSDT showuld be reduced by 1
    expect((await musdtContract.balanceOf(adminAddress)).eq(toWei('99999'))).to.eq(true);

    // Then the call should not revert
    await proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, musdcAddress, toWei('1'));
    // And the EOA's balance of MUSDT should be reduced by 1
    expect((await musdcContract.balanceOf(adminAddress)).eq(toWei('99999'))).to.eq(true);
  });
});
