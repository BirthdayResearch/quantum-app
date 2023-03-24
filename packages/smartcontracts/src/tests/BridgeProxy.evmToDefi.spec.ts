import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeV1, TestToken } from '../generated';
import { deployContracts } from './testUtils/deployment';
import { amountAfterFee, toWei } from './testUtils/mathUtils';

// initMintAndSupport will mint to the EOA address and approve contractAddress.
// This is primarily to help avoid the repetition of code
async function initMintAndSupport(
  proxyBridge: BridgeV1,
  testToken: TestToken,
  eoaAddress: string,
  contractAddress: string,
) {
  await testToken.mint(eoaAddress, toWei('100'));
  await testToken.approve(contractAddress, ethers.constants.MaxInt256);
  // Supporting testToken with hard cap of 15
  await proxyBridge.addSupportedTokens(testToken.address, ethers.utils.parseEther('15'));
}
describe('EVM --> DeFiChain', () => {
  describe('Bridging ERC20 token', () => {
    it('Bridge request before adding support for ERC20 token', async () => {
      const { proxyBridge, testToken } = await loadFixture(deployContracts);
      await expect(
        proxyBridge.bridgeToDeFiChain(
          ethers.utils.toUtf8Bytes('8defichainBurnAddressXXXXXXXdRQkSm'),
          testToken.address,
          toWei('10'),
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
    });

    it('Successfully revert if sending zero ERC20 token', async () => {
      const { proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts);
      await initMintAndSupport(proxyBridge, testToken, defaultAdminSigner.address, proxyBridge.address);
      // This txn should fail. User sending 0 ERC20 along with ETHER. only checking the _amount not value
      await expect(
        proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, 0),
      ).to.be.revertedWithCustomError(proxyBridge, 'REQUESTED_BRIDGE_AMOUNT_IS_ZERO');
    });

    it('Successfully bridging', async () => {
      const { proxyBridge, testToken, defaultAdminSigner, communityAddress } = await loadFixture(deployContracts);
      await initMintAndSupport(proxyBridge, testToken, defaultAdminSigner.address, proxyBridge.address);
      // Testing with testToken (already added in supported token)
      // Contract address balance should be zero
      expect(await testToken.balanceOf(proxyBridge.address)).to.equal(0);

      // Need to add to the timestamp of the previous block to match the next block the tx is mined in
      const expectedTimestamp = (await time.latest()) + 1;
      // Checking contract balance: should be 10 - txFee test tokens
      const txFee = await proxyBridge.transactionFee();
      const amount = toWei('10');
      const expectedBalance = amountAfterFee({ amount, transactionFee: txFee });
      // Bridging 10 tokens
      await expect(proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, amount))
        .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
        .withArgs(ethers.constants.AddressZero, testToken.address, expectedBalance, expectedTimestamp);

      expect(await testToken.balanceOf(proxyBridge.address)).to.equal(expectedBalance);
      // Checking the community wallet balance
      expect(await testToken.balanceOf(communityAddress)).to.be.equal(toWei('10').sub(expectedBalance));
    });

    it('Revert when msg.value > 0', async () => {
      const { proxyBridge, testToken, defaultAdminSigner } = await loadFixture(deployContracts);
      await initMintAndSupport(proxyBridge, testToken, defaultAdminSigner.address, proxyBridge.address);
      await expect(
        proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, testToken.address, toWei('10'), {
          value: toWei('10'),
        }),
      ).to.be.revertedWithCustomError(proxyBridge, 'MSG_VALUE_NOT_ZERO_WHEN_BRIDGING_ERC20');
    });
  });

  describe('Bridge ETH', () => {
    it('Bridge request before adding support for ETH', async () => {
      const { proxyBridge } = await loadFixture(deployContracts);
      await expect(
        proxyBridge.bridgeToDeFiChain(
          ethers.utils.toUtf8Bytes('8defichainBurnAddressXXXXXXXdRQkSm'),
          ethers.constants.AddressZero,
          toWei('10'),
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
    });

    it('Successfully revert if sending zero ETH', async () => {
      const { proxyBridge } = await loadFixture(deployContracts);
      await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('20'));
      await expect(
        proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, {
          value: 0,
        }),
      ).to.be.revertedWithCustomError(proxyBridge, 'REQUESTED_BRIDGE_AMOUNT_IS_ZERO');
    });

    it('Successfully bridging', async () => {
      const { proxyBridge, communityAddress } = await loadFixture(deployContracts);
      await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('20'));
      // Contract address balance should be zero
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(0);
      // Need to add to the timestamp of the previous block to match the next block the tx is mined in
      const expectedTimestamp = (await time.latest()) + 1;
      // Checking contract balance: should be 10 - txFee test tokens
      const txFee = await proxyBridge.transactionFee();
      const amount = toWei('10');
      const expectedBalance = amountAfterFee({ amount, transactionFee: txFee });
      const communityAddrBalanceBeforeBridge = await ethers.provider.getBalance(communityAddress);
      // Bridging 10 tokens
      await expect(
        proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, {
          value: amount,
        }),
      )
        .to.emit(proxyBridge, 'BRIDGE_TO_DEFI_CHAIN')
        .withArgs(ethers.constants.AddressZero, ethers.constants.AddressZero, expectedBalance, expectedTimestamp);

      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(expectedBalance);
      // Checking the community wallet balance
      const communityAddrBalanceAfterBridge = await ethers.provider.getBalance(communityAddress);
      expect(communityAddrBalanceAfterBridge).to.equal(
        communityAddrBalanceBeforeBridge.add(amount.sub(expectedBalance)),
      );
    });

    it('Successfully revert when _amount parameter > 0', async () => {
      const { proxyBridge } = await loadFixture(deployContracts);
      await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('20'));
      await expect(
        proxyBridge.bridgeToDeFiChain(ethers.constants.AddressZero, ethers.constants.AddressZero, toWei('10'), {
          value: toWei('10'),
        }),
      ).to.be.revertedWithCustomError(proxyBridge, 'AMOUNT_PARAMETER_NOT_ZERO_WHEN_BRIDGING_ETH');
    });
  });
});
