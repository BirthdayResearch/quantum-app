import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployContracts } from './testUtils/deployment';

describe('Transaction fee tests', () => {
  describe('Tx Fee tests', () => {
    describe('DEFAULT_ADMIN_ROLE', () => {
      it('Successfully implemented the 0% fee', async () => {
        const { proxyBridge } = await loadFixture(deployContracts);
        // Checking if the implemented fee is 0%
        expect(await proxyBridge.transactionFee()).to.equal(0);
      });

      it('Successfully changes the fee by Admin account', async () => {
        const { proxyBridge, defaultAdminSigner } = await loadFixture(deployContracts);
        // Admin should successfully changes the tx fees to 0.05%
        await proxyBridge.connect(defaultAdminSigner).changeTxFee(5);
        // New fee should be 0.05%
        expect(await proxyBridge.transactionFee()).to.equal(5);
      });
      describe('Emitted Events', () => {
        it('Successfully emitted the event on changes of txn fee', async () => {
          const { proxyBridge, defaultAdminSigner } = await loadFixture(deployContracts);
          // Event called TRANSACTION_FEE_CHANGED should be emitted on Successful withdrawal by the Admin only
          await expect(proxyBridge.connect(defaultAdminSigner).changeTxFee(50))
            .to.emit(proxyBridge, 'TRANSACTION_FEE_CHANGED')
            .withArgs(0, 50);
        });
      });
    });

    describe('ARBITRARY_EOA', () => {
      it('Unable to change the fee by another address', async () => {
        const { proxyBridge, arbitrarySigner } = await loadFixture(deployContracts);
        // Txn should revert with the AccessControl error
        await expect(proxyBridge.connect(arbitrarySigner).changeTxFee(50)).to.be.revertedWith(
          `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
        );
      });
    });
    it('Successfully revert if the fee is greater than `MAX_FEE`', async () => {
      const { proxyBridge } = await loadFixture(deployContracts);
      // Admin should not be able to change the tx fees to more than 100%
      await expect(proxyBridge.changeTxFee(10100)).to.be.revertedWithCustomError(proxyBridge, 'MORE_THAN_MAX_FEE');
      // Fee should be 0%
      expect(await proxyBridge.transactionFee()).to.equal(0);
    });
  });

  describe('Tx fee address tests', () => {
    describe('DEFAULT_ADMIN_ROLE', () => {
      it('Successfully change the address', async () => {
        const { proxyBridge, defaultAdminSigner, arbitrarySigner, communityAddress } = await loadFixture(
          deployContracts,
        );
        expect(await proxyBridge.communityWallet()).to.be.equal(communityAddress);
        // Changing the community wallet address
        await expect(proxyBridge.connect(defaultAdminSigner).changeTxFeeAddress(arbitrarySigner.address))
          .to.emit(proxyBridge, 'TRANSACTION_FEE_ADDRESS_CHANGED')
          .withArgs(communityAddress, arbitrarySigner.address);
      });
    });

    describe('ARBITRARY_EOA', () => {
      it('Successfully revert when changing the community wallet ', async () => {
        const { proxyBridge, arbitrarySigner, communityAddress } = await loadFixture(deployContracts);
        // Changing the community wallet address
        await expect(
          proxyBridge.connect(arbitrarySigner).changeTxFeeAddress(arbitrarySigner.address),
        ).to.be.revertedWith(
          `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
        );

        expect(await proxyBridge.communityWallet()).to.be.equal(communityAddress);
      });
    });

    it('Successfully revert if the address 0x0', async () => {
      const { proxyBridge, communityAddress } = await loadFixture(deployContracts);
      expect(await proxyBridge.communityWallet()).to.be.equal(communityAddress);
      // Changing the community wallet address
      await expect(proxyBridge.changeTxFeeAddress(ethers.constants.AddressZero)).to.be.revertedWithCustomError(
        proxyBridge,
        'ZERO_ADDRESS',
      );
    });
  });
});
