import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployContracts } from './testUtils/deployment';
import { toWei } from './testUtils/mathUtils';

describe('Withdrawal tests', () => {
  describe('WITHDRAW_ROLE', () => {
    it('Successful Withdrawal of ERC20 by WITHDRAW_ROLE only', async () => {
      const { proxyBridge, testToken, testToken2, withdrawSigner, flushReceiveSigner } =
        await loadFixture(deployContracts);
      // Minting 100 tokens to Bridge
      await testToken.mint(proxyBridge.address, toWei('100'));
      await testToken2.mint(proxyBridge.address, toWei('100'));
      // Checking the current balance
      expect(await testToken.balanceOf(proxyBridge.address)).to.equal(toWei('100'));
      expect(await testToken2.balanceOf(proxyBridge.address)).to.equal(toWei('100'));

      // Checking flush address balance before the withdraw
      expect(await testToken.balanceOf(flushReceiveSigner.address)).to.be.equal(0);
      expect(await testToken2.balanceOf(flushReceiveSigner.address)).to.equal(0);
      // Withdrawal by Withdraw Role
      let tx = await proxyBridge.connect(withdrawSigner).withdraw(testToken.address, toWei('20'));
      await tx.wait();
      tx = await proxyBridge.connect(withdrawSigner).withdraw(testToken2.address, toWei('30'));
      await tx.wait();
      // Sanity check for account balances
      expect(await testToken.balanceOf(proxyBridge.address)).to.equal(toWei('80'));
      expect(await testToken2.balanceOf(proxyBridge.address)).to.equal(toWei('70'));
      expect(await testToken.balanceOf(flushReceiveSigner.address)).to.equal(toWei('20'));
      expect(await testToken2.balanceOf(flushReceiveSigner.address)).to.equal(toWei('30'));
    });

    it('Successful withdrawal of ETH by WITHDRAW_ROLE only', async () => {
      const { proxyBridge, withdrawSigner, flushReceiveSigner } = await loadFixture(deployContracts);
      await expect(
        withdrawSigner.sendTransaction({
          to: proxyBridge.address,
          value: toWei('100'),
        }),
      )
        .to.emit(proxyBridge, 'ETH_RECEIVED_VIA_RECEIVE_FUNCTION')
        .withArgs(withdrawSigner.address, toWei('100'));
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('100'));
      const balanceFlushReceiveSignerBeforeWithdraw = await ethers.provider.getBalance(flushReceiveSigner.address);
      const balanceBridgeBeforeWithdraw = await ethers.provider.getBalance(proxyBridge.address);
      await proxyBridge.connect(withdrawSigner).withdraw(ethers.constants.AddressZero, toWei('10'));
      const balanceFlushReceiveSignerAfterWithdraw = await ethers.provider.getBalance(flushReceiveSigner.address);
      const balanceBridgeAfterWithdraw = await ethers.provider.getBalance(proxyBridge.address);
      expect(balanceFlushReceiveSignerAfterWithdraw).to.equal(balanceFlushReceiveSignerBeforeWithdraw.add(toWei('10')));
      expect(balanceBridgeAfterWithdraw).to.equal(balanceBridgeBeforeWithdraw.sub(toWei('10')));
    });

    it('Unable to withdraw more ERC20 than the balance of the Bridge', async () => {
      const { proxyBridge, testToken, withdrawSigner } = await loadFixture(deployContracts);
      // Contract balance of testToken is '0'
      // Test should revert if requesting amount bigger than actual balance of the Bridge.
      await expect(proxyBridge.connect(withdrawSigner).withdraw(testToken.address, toWei('110'))).to.be.revertedWith(
        'ERC20: transfer amount exceeds balance',
      );
    });

    it('Unable to withdraw more ETH than the balance of the Bridge', async () => {
      const { proxyBridge, withdrawSigner } = await loadFixture(deployContracts);
      await withdrawSigner.sendTransaction({
        to: proxyBridge.address,
        value: toWei('2'),
      });
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('2'));
      await expect(
        proxyBridge.connect(withdrawSigner).withdraw(ethers.constants.AddressZero, toWei('10')),
      ).to.revertedWithCustomError(proxyBridge, 'ETH_TRANSFER_FAILED');
    });
  });
  describe('DEFAULT_ADMIN_ROLE', () => {
    it('Unsuccessful withdrawal by those with DEFAULT_ADMIN_ROLE but does not have WITHDRAW_ROLE', async () => {
      const { proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts);
      const WITHDRAW_ROLE = ethers.utils.solidityKeccak256(['string'], ['WITHDRAW_ROLE']);
      // sanity check on whether we need to make address lower-case when calling functions
      // turn out both mixedcase and lower-case are okay
      expect(await proxyBridge.hasRole(`0x${'0'.repeat(64)}`, defaultAdminSigner.address)).to.equal(true);
      expect(await proxyBridge.hasRole(`0x${'0'.repeat(64)}`, defaultAdminSigner.address.toLowerCase())).to.equal(true);
      expect(await proxyBridge.hasRole(WITHDRAW_ROLE, defaultAdminSigner.address)).to.equal(false);
      // Withdrawal by defaultAdminSigner should be rejected if it has not been granted WITHDRAW_ROLE
      await expect(proxyBridge.connect(defaultAdminSigner).withdraw(testToken.address, toWei('20'))).to.be.revertedWith(
        `AccessControl: account ${defaultAdminSigner.address.toLowerCase()} is missing role ${WITHDRAW_ROLE}`,
      );
    });
  });
  describe('ARBITRARY_EOA', () => {
    it('Unsuccessful withdrawal by other EOA', async () => {
      const { proxyBridge, arbitrarySigner, testToken } = await loadFixture(deployContracts);
      const WITHDRAW_ROLE = ethers.utils.solidityKeccak256(['string'], ['WITHDRAW_ROLE']);
      expect(await proxyBridge.hasRole(WITHDRAW_ROLE, arbitrarySigner.address)).to.equal(false);
      await expect(proxyBridge.connect(arbitrarySigner).withdraw(testToken.address, toWei('20'))).to.be.revertedWith(
        `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role ${WITHDRAW_ROLE}`,
      );
    });
  });
});
