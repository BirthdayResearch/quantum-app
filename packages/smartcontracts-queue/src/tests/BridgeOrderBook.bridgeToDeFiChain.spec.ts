import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeQueue, TestToken } from '../generated';
import { deployContracts } from './utils/deployment';
import { toWei } from './utils/mathUtils';

describe('Bridge order tests', () => {
  describe('Administrative functions', () => {
    let proxyBridge: BridgeQueue;
    let testToken: TestToken;
    let defaultAdminSigner: SignerWithAddress;
    let arbitrarySigner: SignerWithAddress;
    describe('Add supported tokens', () => {
      it('Should add supported tokens successfully', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
        await expect(proxyBridge.connect(defaultAdminSigner).addSupportedToken(testToken.address))
          .to.emit(proxyBridge, 'TOKEN_SUPPORTED')
          .withArgs(testToken.address);
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(true);
      });

      it('Failed to add because of unauthorization', async () => {
        ({ proxyBridge, testToken, arbitrarySigner } = await loadFixture(deployContracts));
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
        await expect(proxyBridge.connect(arbitrarySigner).addSupportedToken(testToken.address)).to.be.reverted;
      });

      it('Should revert when token is already supported', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
        await expect(proxyBridge.connect(defaultAdminSigner).addSupportedToken(testToken.address))
          .to.emit(proxyBridge, 'TOKEN_SUPPORTED')
          .withArgs(testToken.address);
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(true);
        await expect(
          proxyBridge.connect(defaultAdminSigner).addSupportedToken(testToken.address),
        ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_ALREADY_SUPPORTED');
      });
    });

    describe('Remove supported token', () => {
      it('Should remove supported token successfully', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(testToken.address);
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(true);
        await expect(proxyBridge.connect(defaultAdminSigner).removeSupportedToken(testToken.address))
          .to.emit(proxyBridge, 'TOKEN_REMOVED')
          .withArgs(testToken.address);
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
      });

      it("Can't remove supported token because of not being authorized", async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(false);
        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(testToken.address);
        expect(await proxyBridge.supportedTokens(testToken.address)).to.equal(true);
        await expect(proxyBridge.connect(arbitrarySigner).removeSupportedToken(testToken.address)).to.be.revertedWith(
          `AccessControl: account ${arbitrarySigner.address.toLowerCase()} is missing role 0x${'0'.repeat(64)}`,
        );
      });

      it('Should not remove because the token is not supported yet', async () => {
        ({ defaultAdminSigner, testToken } = await loadFixture(deployContracts));
        await expect(
          proxyBridge.connect(defaultAdminSigner).removeSupportedToken(testToken.address),
        ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
      });
    });

    describe('Change Tx Fee', () => {
      it('Should be able to change tx fee successfully', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(defaultAdminSigner).changeTxFee(1000))
          .to.emit(proxyBridge, 'TRANSACTION_FEE_CHANGED')
          .withArgs(0, 1000);

        expect(await proxyBridge.transactionFee()).to.equal(1000);
      });

      it('Should not be able to change tx fee if not authorized', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner, arbitrarySigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(arbitrarySigner).changeTxFee(1000)).to.be.reverted;
        expect(await proxyBridge.transactionFee()).to.equal(0);
      });

      it('Should not be able to make tx Fee higher than maximum', async () => {
        ({ proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(defaultAdminSigner).changeTxFee(10001)).to.be.reverted;
      });
    });

    describe('Change cold wallet', () => {
      it('Should be able to change cold wallet', async () => {
        let coldWalletSigner: SignerWithAddress;
        ({ proxyBridge, defaultAdminSigner, arbitrarySigner, coldWalletSigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(defaultAdminSigner).changeColdWallet(arbitrarySigner.address))
          .to.emit(proxyBridge, 'COLD_WALLET_CHANGED')
          .withArgs(coldWalletSigner.address, arbitrarySigner.address);
        expect(await proxyBridge.coldWallet()).to.equal(arbitrarySigner.address);
      });

      it('Should not be able to change cold wallet because of being unauthorized', async () => {
        let coldWalletSigner: SignerWithAddress;
        ({ proxyBridge, arbitrarySigner, coldWalletSigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(arbitrarySigner).changeColdWallet(arbitrarySigner.address)).to.reverted;
        expect(await proxyBridge.coldWallet()).to.equal(coldWalletSigner.address);
      });

      it('Should not be able to change cold wallet if new address is zero address', async () => {
        ({ proxyBridge, defaultAdminSigner, arbitrarySigner } = await loadFixture(deployContracts));
        await expect(
          proxyBridge.connect(defaultAdminSigner).changeColdWallet(ethers.constants.AddressZero),
        ).to.be.revertedWithCustomError(proxyBridge, 'INVALID_COLD_WALLET');
      });
    });

    describe('Change community wallet', () => {
      it('Should be able to change community wallet', async () => {
        let communityWalletSigner: SignerWithAddress;
        ({ proxyBridge, defaultAdminSigner, arbitrarySigner, communityWalletSigner } = await loadFixture(
          deployContracts,
        ));
        await expect(proxyBridge.connect(defaultAdminSigner).changeCommunityWallet(arbitrarySigner.address))
          .to.emit(proxyBridge, 'COMMUNITY_WALLET_CHANGED')
          .withArgs(communityWalletSigner.address, arbitrarySigner.address);
        expect(await proxyBridge.communityWallet()).to.equal(arbitrarySigner.address);
      });

      it('Should not be able to change community wallet because of being unauthorized', async () => {
        let communityWalletSigner: SignerWithAddress;
        ({ proxyBridge, arbitrarySigner, communityWalletSigner } = await loadFixture(deployContracts));
        await expect(proxyBridge.connect(arbitrarySigner).changeCommunityWallet(arbitrarySigner.address)).to.reverted;
        expect(await proxyBridge.communityWallet()).to.equal(communityWalletSigner.address);
      });

      it('Should not be able to change community wallet if new address is zero address', async () => {
        ({ proxyBridge, defaultAdminSigner, arbitrarySigner } = await loadFixture(deployContracts));
        await expect(
          proxyBridge.connect(defaultAdminSigner).changeCommunityWallet(ethers.constants.AddressZero),
        ).to.be.revertedWithCustomError(proxyBridge, 'INVALID_COMMUNITY_WALLET');
      });
    });
  });

  describe('Handling bridging request', () => {
    describe('Test bridgeToDeFiChain function for ETH token', () => {
      it('Revert before adding support', async () => {
        const { proxyBridge } = await loadFixture(deployContracts);

        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, {
            value: toWei('1'),
          }),
        ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
      });

      it('Revert when the _amount input is non-zero', async () => {
        const { proxyBridge, defaultAdminSigner } = await loadFixture(deployContracts);

        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(ethers.constants.AddressZero);

        expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, toWei('1'), {
            value: toWei('1'),
          }),
        ).to.be.revertedWithCustomError(proxyBridge, 'AMOUNT_PARAMETER_NOT_ZERO_WHEN_BRIDGING_ETH');
      });

      it('Revert when the ETH amount requested is zero', async () => {
        const { proxyBridge, defaultAdminSigner } = await loadFixture(deployContracts);

        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(ethers.constants.AddressZero);

        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, { value: 0 }),
        ).to.be.revertedWithCustomError(proxyBridge, 'REQUESTED_BRIDGE_AMOUNT_IS_ZERO');
      });

      it('Should be able to bridge when all requirements are satisfied', async () => {
        const { proxyBridge, defaultAdminSigner, coldWalletSigner, communityWalletSigner } = await loadFixture(
          deployContracts,
        );

        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(ethers.constants.AddressZero);

        expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
        expect(await ethers.provider.getBalance(coldWalletSigner.address)).to.equal(toWei('10000'));
        expect(await ethers.provider.getBalance(communityWalletSigner.address)).to.equal(toWei('10000'));

        // check that it emits the right event
        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, {
            value: toWei('1'),
          }),
        )
          .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
          .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, toWei('1'));

        expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
        expect(await ethers.provider.getBalance(coldWalletSigner.address)).to.equal(toWei('10001'));
        expect(await ethers.provider.getBalance(communityWalletSigner.address)).to.equal(toWei('10000'));
      });

      it('Change the txFee, should calculate correctly the amount being bridged', async () => {
        const { proxyBridge, defaultAdminSigner, communityWalletSigner, coldWalletSigner } = await loadFixture(
          deployContracts,
        );

        await proxyBridge.connect(defaultAdminSigner).changeTxFee(1000);

        await proxyBridge.connect(defaultAdminSigner).addSupportedToken(ethers.constants.AddressZero);

        expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
        expect(await ethers.provider.getBalance(coldWalletSigner.address)).to.equal(toWei('10000'));
        expect(await ethers.provider.getBalance(communityWalletSigner.address)).to.equal(toWei('10000'));

        // check that it emits the right event
        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, {
            value: toWei('1'),
          }),
        )
          .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
          .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, toWei('0.9'));

        expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
        expect(await ethers.provider.getBalance(coldWalletSigner.address)).to.equal(toWei('10000.9'));
        expect(await ethers.provider.getBalance(communityWalletSigner.address)).to.equal(toWei('10000.1'));
      });
    });

    describe('Test bridgeToDeFiChain function for ERC20 token', () => {
      it('Revert before adding support', async () => {
        const { proxyBridge, testToken } = await loadFixture(deployContracts);

        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, toWei('1')),
        ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
      });

      it('Revert when the msg.value input is non-zero', async () => {
        const { proxyBridge, testToken } = await loadFixture(deployContracts);

        await proxyBridge.addSupportedToken(testToken.address);

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);
        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, toWei('1'), {
            value: toWei('1'),
          }),
        ).to.be.revertedWithCustomError(proxyBridge, 'MSG_VALUE_NOT_ZERO_WHEN_BRIDGING_ERC20');
      });

      it('Revert when the ERC20 requested amount is zero', async () => {
        const { proxyBridge, testToken } = await loadFixture(deployContracts);

        await proxyBridge.addSupportedToken(testToken.address);

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);

        await expect(
          proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, 0),
        ).to.be.revertedWithCustomError(proxyBridge, 'REQUESTED_BRIDGE_AMOUNT_IS_ZERO');
      });

      it('Should be able to bridge when all the requirements are satisfied', async () => {
        const { proxyBridge, testToken, coldWalletSigner, communityWalletSigner, defaultAdminSigner } =
          await loadFixture(deployContracts);

        await proxyBridge.addSupportedToken(testToken.address);

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);
        expect(await testToken.balanceOf(coldWalletSigner.address)).to.equal(0);
        expect(await testToken.balanceOf(communityWalletSigner.address)).to.equal(0);
        await testToken.approve(proxyBridge.address, ethers.constants.MaxUint256);
        await testToken.mint(defaultAdminSigner.address, toWei('1'));

        await expect(proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, toWei('1')))
          .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
          .withArgs(ethers.constants.AddressZero, testToken.address, toWei('1'));

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);
        expect(await testToken.balanceOf(coldWalletSigner.address)).to.equal(toWei('1'));
        expect(await testToken.balanceOf(communityWalletSigner.address)).to.equal(toWei('0'));
      });

      it('Should be able to behave correctly when the transaction fee is changed', async () => {
        const { proxyBridge, testToken, coldWalletSigner, communityWalletSigner, defaultAdminSigner } =
          await loadFixture(deployContracts);

        await proxyBridge.connect(defaultAdminSigner).changeTxFee(1000);

        await proxyBridge.addSupportedToken(testToken.address);

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);
        expect(await testToken.balanceOf(coldWalletSigner.address)).to.equal(0);
        expect(await testToken.balanceOf(communityWalletSigner.address)).to.equal(0);

        await testToken.approve(proxyBridge.address, ethers.constants.MaxUint256);
        await testToken.mint(defaultAdminSigner.address, toWei('1'));

        await expect(proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, toWei('1')))
          .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
          .withArgs(ethers.constants.AddressZero, testToken.address, toWei('0.9'));

        expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);
        expect(await testToken.balanceOf(coldWalletSigner.address)).to.equal(toWei('0.9'));
        expect(await testToken.balanceOf(communityWalletSigner.address)).to.equal(toWei('0.1'));
      });
    });
  });

  describe('Test initialization of support for tokens', () => {
    it('Token 3 and token 4 should be supported after initialization', async () => {
      const { proxyBridge, testToken3, testToken4 } = await loadFixture(deployContracts);
      expect(await proxyBridge.supportedTokens(testToken3.address)).to.equal(true);
      expect(await proxyBridge.supportedTokens(testToken4.address)).to.equal(true);
    });
  });
});
