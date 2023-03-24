import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { deployContracts } from './testUtils/deployment';

describe('Relayer address change tests', () => {
  describe('DEFAULT_ADMIN_ROLE', () => {
    it('Successfully change the relayer address By Admin account', async () => {
      const { proxyBridge, defaultAdminSigner, withdrawSigner } = await loadFixture(deployContracts);
      // Change relayer address by Admin and Operational addresses
      expect(await proxyBridge.relayerAddress()).to.equal(defaultAdminSigner.address);
      await proxyBridge.connect(defaultAdminSigner).changeRelayerAddress(withdrawSigner.address);
      expect(await proxyBridge.relayerAddress()).to.equal(withdrawSigner.address);
    });

    it('Unable to change if new address is 0x0', async () => {
      const { proxyBridge, defaultAdminSigner } = await loadFixture(deployContracts);
      // Test will fail with the error if input address is a dead address "0x0"
      expect(await proxyBridge.relayerAddress()).to.equal(defaultAdminSigner.address);
      await expect(
        proxyBridge.connect(defaultAdminSigner).changeRelayerAddress('0x0000000000000000000000000000000000000000'),
      ).to.be.revertedWithCustomError(proxyBridge, 'ZERO_ADDRESS');
    });
  });

  describe('ARBITRARY_EOA', () => {
    it('Unable to change relayer address if not DEFAULT_ADMIN_ROLE', async () => {
      const { proxyBridge, defaultAdminSigner, withdrawSigner, arbitrarySigner } = await loadFixture(deployContracts);
      // Test will fail if the signer is neither admin or operational admin
      expect(await proxyBridge.relayerAddress()).to.equal(defaultAdminSigner.address);
      await expect(
        proxyBridge.connect(arbitrarySigner).changeRelayerAddress(withdrawSigner.address),
      ).to.be.revertedWith(
        `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
      );
      expect(await proxyBridge.relayerAddress()).to.equal(defaultAdminSigner.address);
    });
  });

  describe('Emitted Events', () => {
    it('Successfully emitted the event on change of relayer address by Admin', async () => {
      const { proxyBridge, defaultAdminSigner, arbitrarySigner } = await loadFixture(deployContracts);
      // Event called RELAYER_ADDRESS_CHANGED should be emitted on Successful Change by the Admin
      await expect(proxyBridge.connect(defaultAdminSigner).changeRelayerAddress(arbitrarySigner.address))
        .to.emit(proxyBridge, 'RELAYER_ADDRESS_CHANGED')
        .withArgs(defaultAdminSigner.address, arbitrarySigner.address);
    });
  });
});
