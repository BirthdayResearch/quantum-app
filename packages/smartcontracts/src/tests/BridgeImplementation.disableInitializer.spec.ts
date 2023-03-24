import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';

import { deployContracts } from './testUtils/deployment';

describe('Test ', () => {
  it('Should disable the initialization of the implementation contract after creating it', async () => {
    const { bridgeImplementation, defaultAdminSigner, withdrawSigner, communityAddress, flushReceiveSigner } =
      await loadFixture(deployContracts);

    await expect(
      bridgeImplementation.initialize(
        defaultAdminSigner.address,
        withdrawSigner.address,
        defaultAdminSigner.address,
        communityAddress,
        10,
        flushReceiveSigner.address,
      ),
    ).to.be.revertedWith('Initializable: contract is already initialized');
  });
});
