import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployContracts } from './testUtils/deployment';
import { toWei } from './testUtils/mathUtils';

describe('Test flushMultipleTokenFunds functionalities', () => {
  it('Should flush the funds successfully when there is initial redundant funds', async () => {
    const { proxyBridge, testToken, testToken2, flushReceiveSigner, defaultAdminSigner } =
      await loadFixture(deployContracts);
    const ERC20 = await ethers.getContractFactory('TestToken');
    const testToken3 = await ERC20.deploy('Test3', 'T3');
    // Supporting testToken with hard cap of 20
    await proxyBridge.addSupportedTokens(testToken.address, toWei('20'));
    // Supporting testToken2 with hard cap of 30
    await proxyBridge.addSupportedTokens(testToken2.address, toWei('30'));
    // Supporting testToken3 with hard cap of 40
    await proxyBridge.addSupportedTokens(testToken3.address, toWei('40'));
    // Supporting ether with hard cap of 60
    await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('60'));
    // Minting tokens to proxy bridge
    await testToken.mint(proxyBridge.address, toWei('100'));
    await testToken2.mint(proxyBridge.address, toWei('100'));
    await testToken3.mint(proxyBridge.address, toWei('100'));
    await defaultAdminSigner.sendTransaction({
      to: proxyBridge.address,
      value: toWei('100'),
    });
    // Getting balance of respected tokens before calling `flushMultipleTokenFunds()`
    const balance1BeforeFlush = await testToken.balanceOf(flushReceiveSigner.address);
    const balance2BeforeFlush = await testToken2.balanceOf(flushReceiveSigner.address);
    const balance3BeforeFlush = await testToken3.balanceOf(flushReceiveSigner.address);
    const balanceETHBeforeFlush = await ethers.provider.getBalance(flushReceiveSigner.address);
    // This tokens should revert as we don't _`toIndex` is greater than supportedTokens.length
    await expect(proxyBridge.flushMultipleTokenFunds(0, 5)).to.revertedWithCustomError(proxyBridge, 'INVALID_TOINDEX');
    // Flushing token from 0 to 4 index. This will flush 0, 1, 2 and 3 tokens.
    await proxyBridge.flushMultipleTokenFunds(0, 4);
    // Getting balance of respected tokens after calling `flushMultipleTokenFunds()`
    const balance1AfterFlush = await testToken.balanceOf(flushReceiveSigner.address);
    const balance2AfterFlush = await testToken2.balanceOf(flushReceiveSigner.address);
    const balance3AfterFlush = await testToken3.balanceOf(flushReceiveSigner.address);
    const balanceETHAfterFlush = await ethers.provider.getBalance(flushReceiveSigner.address);
    expect(balance1AfterFlush.sub(balance1BeforeFlush)).to.equal(toWei('80'));
    expect(balance2AfterFlush.sub(balance2BeforeFlush)).to.equal(toWei('70'));
    expect(balance3AfterFlush.sub(balance3BeforeFlush)).to.equal(toWei('60'));
    expect(balanceETHAfterFlush.sub(balanceETHBeforeFlush)).to.equal(toWei('40'));
  });

  it('Should revert if ERC20 is not supported', async () => {
    const { proxyBridge, testToken } = await loadFixture(deployContracts);
    await expect(proxyBridge.flushFundPerToken(testToken.address)).to.be.revertedWithCustomError(
      proxyBridge,
      'TOKEN_NOT_SUPPORTED',
    );
  });

  it('Should flush the funds per token successfully when there is initial redundant funds per `tokenAddress`', async () => {
    const { proxyBridge, testToken, testToken2, flushReceiveSigner, defaultAdminSigner } =
      await loadFixture(deployContracts);

    // Supporting testToken with hard cap of 20
    await proxyBridge.addSupportedTokens(testToken.address, toWei('20'));
    // Supporting testToken2 with hard cap of 30
    await proxyBridge.addSupportedTokens(testToken2.address, toWei('30'));
    // Supporting ether with hard cap of 60
    await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('60'));
    // Minting tokens to proxy bridge
    await testToken.mint(proxyBridge.address, toWei('100'));
    await testToken2.mint(proxyBridge.address, toWei('100'));
    await defaultAdminSigner.sendTransaction({
      to: proxyBridge.address,
      value: toWei('100'),
    });
    // Getting balance of respected tokens before calling `flushMultipleTokenFunds()`
    const balance1BeforeFlush = await testToken.balanceOf(flushReceiveSigner.address);
    const balance2BeforeFlush = await testToken2.balanceOf(flushReceiveSigner.address);
    const balanceETHBeforeFlush = await ethers.provider.getBalance(flushReceiveSigner.address);
    // Flushing excess fund per token address
    await proxyBridge.flushFundPerToken(testToken.address);
    await proxyBridge.flushFundPerToken(testToken2.address);
    await proxyBridge.flushFundPerToken(ethers.constants.AddressZero);
    // Getting balance of respected tokens after calling `flushMultipleTokenFunds()`
    const balance1AfterFlush = await testToken.balanceOf(flushReceiveSigner.address);
    const balance2AfterFlush = await testToken2.balanceOf(flushReceiveSigner.address);
    const balanceETHAfterFlush = await ethers.provider.getBalance(flushReceiveSigner.address);
    expect(balance1AfterFlush.sub(balance1BeforeFlush)).to.equal(toWei('80'));
    expect(balance2AfterFlush.sub(balance2BeforeFlush)).to.equal(toWei('70'));
    expect(balanceETHAfterFlush.sub(balanceETHBeforeFlush)).to.equal(toWei('40'));
  });

  it('Revert if changing `flushReceiveAddress` to 0x0', async () => {
    const { proxyBridge, flushReceiveSigner } = await loadFixture(deployContracts);
    expect(await proxyBridge.flushReceiveAddress()).to.be.equal(flushReceiveSigner.address);
    await expect(proxyBridge.changeFlushReceiveAddress(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
      proxyBridge,
      'ZERO_ADDRESS',
    );
    expect(await proxyBridge.flushReceiveAddress()).to.be.equal(flushReceiveSigner.address);
  });

  describe('DEFAULT_ADMIN_ROLE', () => {
    it('Should be able to change `flushReceiveAddress`', async () => {
      const { proxyBridge, defaultAdminSigner, flushReceiveSigner, arbitrarySigner } =
        await loadFixture(deployContracts);
      expect(await proxyBridge.flushReceiveAddress()).to.be.equal(flushReceiveSigner.address);
      await expect(proxyBridge.connect(defaultAdminSigner).changeFlushReceiveAddress(arbitrarySigner.address))
        .to.emit(proxyBridge, 'CHANGE_FLUSH_RECEIVE_ADDRESS')
        .withArgs(flushReceiveSigner.address, arbitrarySigner.address);
      expect(await proxyBridge.flushReceiveAddress()).to.be.equal(arbitrarySigner.address);
    });
  });

  describe('ARBITRARY_EOA', () => {
    it('Revert when changing `flushReceiveAddress`', async () => {
      const { proxyBridge, defaultAdminSigner, flushReceiveSigner, arbitrarySigner } =
        await loadFixture(deployContracts);
      expect(await proxyBridge.flushReceiveAddress()).to.be.equal(flushReceiveSigner.address);
      await expect(
        proxyBridge.connect(arbitrarySigner).changeFlushReceiveAddress(defaultAdminSigner.address),
      ).to.be.revertedWith(
        `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
      );
      expect(await proxyBridge.flushReceiveAddress()).to.be.equal(flushReceiveSigner.address);
    });
  });
});
