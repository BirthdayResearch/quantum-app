import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeV1, TestToken } from '../generated';
import { deployContracts } from './testUtils/deployment';
import { getCurrentTimeStamp, toWei } from './testUtils/mathUtils';

describe('DeFiChain --> EVM', () => {
  let proxyBridge: BridgeV1;
  let testToken: TestToken;
  let testToken2: TestToken;
  let defaultAdminSigner: SignerWithAddress;
  let withdrawSigner: SignerWithAddress;
  let arbitrarySigner: SignerWithAddress;
  let domainData: any;
  const eip712Types = {
    CLAIM: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'tokenAddress', type: 'address' },
    ],
  };

  describe('Test for ERC20', () => {
    beforeEach(async () => {
      ({ proxyBridge, testToken, testToken2, defaultAdminSigner, withdrawSigner, arbitrarySigner } = await loadFixture(
        deployContracts,
      ));
      domainData = {
        name: 'QUANTUM_BRIDGE',
        version: '1',
        chainId: 1337,
        verifyingContract: proxyBridge.address,
      };
      // Minting 100 testToken to ProxyContract
      await testToken.mint(proxyBridge.address, toWei('100'));
      // Supporting testToken with hard cap of 15
      await proxyBridge.addSupportedTokens(testToken.address, toWei('15'));
    });

    it('Valid signature, recipient address is the same as msg.sender', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: testToken.address,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
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
    });

    it('Valid signature, recipient address is different from msg.sender', async () => {
      const eip712Data = {
        to: withdrawSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: testToken.address,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      // Checking Balance before claiming fund, should be 0
      expect(await testToken.balanceOf(withdrawSigner.address)).to.equal(0);
      await proxyBridge
        .connect(defaultAdminSigner)
        .claimFund(withdrawSigner.address, toWei('10'), 0, ethers.constants.MaxUint256, testToken.address, signature);
      // Checking Balance after claiming fund, should be 10
      expect(await testToken.balanceOf(withdrawSigner.address)).to.equal(toWei('10'));
    });

    it('Invalid Signature', async () => {
      const eip712Data = {
        to: withdrawSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: testToken.address,
      };
      // Relayer address is defaultAdminSigner, if not signed by relayer address, txn should fail.
      const signature = await withdrawSigner._signTypedData(domainData, eip712Types, eip712Data);
      await expect(
        proxyBridge.claimFund(
          withdrawSigner.address,
          toWei('10'),
          0,
          ethers.constants.MaxUint256,
          testToken.address,
          signature,
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'FAKE_SIGNATURE');
      // Checking Balance after Unsuccessfully claiming fund, should be 0
      expect(await testToken.balanceOf(withdrawSigner.address)).to.equal(0);
    });

    it('Incorrect nonce', async () => {
      // Correct nonce should be Zero
      await expect(
        proxyBridge.claimFund(
          withdrawSigner.address,
          toWei('10'),
          1,
          ethers.constants.MaxUint256,
          testToken.address,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'INCORRECT_NONCE');
      // Checking Balance after Unsuccessfully claiming fund, should be 0
      expect(await testToken.balanceOf(withdrawSigner.address)).to.equal(0);
    });

    it('Unsupported token', async () => {
      await testToken2.mint(proxyBridge.address, toWei('100'));
      await expect(
        proxyBridge.claimFund(
          withdrawSigner.address,
          toWei('10'),
          0,
          ethers.constants.MaxUint256,
          testToken2.address,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'TOKEN_NOT_SUPPORTED');
      expect(await testToken2.balanceOf(proxyBridge.address)).to.equal(toWei('100'));
      // Checking Balance after Unsuccessfully claiming fund, should be 0
      expect(await testToken2.balanceOf(withdrawSigner.address)).to.equal(0);
    });

    it('Successfully revert when claiming more ERC20 than available balance', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('110'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: testToken.address,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      expect(await testToken.balanceOf(proxyBridge.address)).to.equal(toWei('100'));
      // This should revert because proxy contract has only 100 tokens
      await expect(
        proxyBridge.claimFund(
          defaultAdminSigner.address,
          toWei('110'),
          0,
          ethers.constants.MaxUint256,
          testToken.address,
          signature,
        ),
      ).to.be.revertedWith('ERC20: transfer amount exceeds balance');
      expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(toWei('0'));
    });

    it('Successfully revert when claim deadline expired', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: testToken.address,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      // Checking Balance before claiming fund, should be 0
      expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(0);
      await expect(
        proxyBridge.claimFund(
          defaultAdminSigner.address,
          toWei('10'),
          0,
          // Deadline pass currentTime - 1 hr
          getCurrentTimeStamp() - 60 * 60 * 1,
          testToken.address,
          signature,
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'EXPIRED_CLAIM');
      // Checking Balance after claiming fund, should be 0
      expect(await testToken.balanceOf(defaultAdminSigner.address)).to.equal(toWei('0'));
    });

    describe('Emitted events', () => {
      it('Successfully emitted event when claiming fund', async () => {
        const eip712Data = {
          to: defaultAdminSigner.address,
          amount: toWei('10'),
          nonce: 0,
          deadline: ethers.constants.MaxUint256,
          tokenAddress: testToken.address,
        };

        const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
        // Event called CLAIM_FUND should be emitted when Successfully claim fund
        await expect(
          proxyBridge.claimFund(
            defaultAdminSigner.address,
            toWei('10'),
            0,
            ethers.constants.MaxUint256,
            testToken.address,
            signature,
          ),
        )
          .to.emit(proxyBridge, 'CLAIM_FUND')
          .withArgs(testToken.address, defaultAdminSigner.address, toWei('10'));
      });
    });
  });

  describe('Test for ETH', () => {
    beforeEach(async () => {
      ({ proxyBridge, testToken, testToken2, defaultAdminSigner, withdrawSigner } = await loadFixture(deployContracts));
      domainData = {
        name: 'QUANTUM_BRIDGE',
        version: '1',
        chainId: 1337,
        verifyingContract: proxyBridge.address,
      };
      await defaultAdminSigner.sendTransaction({
        to: proxyBridge.address,
        value: toWei('100'),
      });
      // Supporting ether with hard cap of 15
      await proxyBridge.addSupportedTokens(ethers.constants.AddressZero, toWei('15'));
    });

    it('Successfully claim when the signature is valid, msg.sender is the same as the recipient of the fund', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: ethers.constants.AddressZero,
      };
      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      const ethBalanceAdminBeforeClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      const ethBalanceBridgeBeforeClaim = await ethers.provider.getBalance(proxyBridge.address);
      const tx = await proxyBridge.claimFund(
        defaultAdminSigner.address,
        toWei('10'),
        0,
        ethers.constants.MaxUint256,
        ethers.constants.AddressZero,
        signature,
      );
      const receipt = await tx.wait();
      const ethBalanceAdminAfterClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      const ethBalanceBridgeAfterClaim = await ethers.provider.getBalance(proxyBridge.address);
      // Checking Balance after claiming fund, should be 10
      expect(ethBalanceAdminAfterClaim).to.equal(
        ethBalanceAdminBeforeClaim.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)).add(toWei('10')),
      );
      expect(ethBalanceBridgeAfterClaim).to.equal(ethBalanceBridgeBeforeClaim.sub(toWei('10')));
    });

    it('Successfully claim when the signature is valid, msg.sender is different from the recipient of the fund', async () => {
      const eip712Data = {
        to: withdrawSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: ethers.constants.AddressZero,
      };
      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      const ethBalanceWithdrawSignerBeforeClaim = await ethers.provider.getBalance(withdrawSigner.address);
      const ethBalanceBridgeBeforeClaim = await ethers.provider.getBalance(proxyBridge.address);
      const ethBalanceDefaultAdminBeforeClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      const tx = await proxyBridge
        .connect(defaultAdminSigner)
        .claimFund(
          withdrawSigner.address,
          toWei('10'),
          0,
          ethers.constants.MaxUint256,
          ethers.constants.AddressZero,
          signature,
        );
      const receipt = await tx.wait();
      const ethBalanceWithdrawSignerAfterClaim = await ethers.provider.getBalance(withdrawSigner.address);
      const ethBalanceBridgeAfterClaim = await ethers.provider.getBalance(proxyBridge.address);
      const ethBalanceDefaultAdminAfterClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      // Checking Balance after claiming fund, should be 10
      expect(ethBalanceWithdrawSignerAfterClaim).to.equal(ethBalanceWithdrawSignerBeforeClaim.add(toWei('10')));
      expect(ethBalanceBridgeAfterClaim).to.equal(ethBalanceBridgeBeforeClaim.sub(toWei('10')));
      expect(ethBalanceDefaultAdminAfterClaim).to.equal(
        ethBalanceDefaultAdminBeforeClaim.sub(receipt.gasUsed.mul(receipt.effectiveGasPrice)),
      );
    });

    it('Invalid Signature', async () => {
      const eip712Data = {
        to: withdrawSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: ethers.constants.AddressZero,
      };
      // Relayer address is defaultAdminSigner, if not signed by relayer address, txn should fail.
      const signature = await arbitrarySigner._signTypedData(domainData, eip712Types, eip712Data);
      const balanceWithdrawSignerBeforeClaim = await ethers.provider.getBalance(withdrawSigner.address);
      await expect(
        proxyBridge.claimFund(
          withdrawSigner.address,
          toWei('10'),
          0,
          ethers.constants.MaxUint256,
          ethers.constants.AddressZero,
          signature,
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'FAKE_SIGNATURE');
      const balanceWithdrawSignerAfterClaim = await ethers.provider.getBalance(withdrawSigner.address);
      expect(balanceWithdrawSignerAfterClaim).to.equal(balanceWithdrawSignerBeforeClaim);
    });

    it('Incorrect nonce', async () => {
      const ethBalanceWithdrawSignerBeforeClaim = await ethers.provider.getBalance(withdrawSigner.address);
      // Correct nonce should be Zero
      await expect(
        proxyBridge.claimFund(
          withdrawSigner.address,
          toWei('10'),
          1,
          ethers.constants.MaxUint256,
          ethers.constants.AddressZero,
          '0x00',
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'INCORRECT_NONCE');
      const ethBalanceWithdrawSignerAfterClaim = await ethers.provider.getBalance(withdrawSigner.address);
      // ETH Balance of operational admin after claiming is equal to the one before claiming
      expect(ethBalanceWithdrawSignerAfterClaim).to.equal(ethBalanceWithdrawSignerBeforeClaim);
    });

    it('Successfully revert when claiming more ETH than available balance', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('110'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: ethers.constants.AddressZero,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('100'));
      const ethBalanceDefaultAdminBeforeClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      const blockBeforeClaim = await ethers.provider.getBlock('latest');
      // This should revert because proxy contract has only 100 ETH
      await expect(
        proxyBridge.claimFund(
          defaultAdminSigner.address,
          toWei('110'),
          0,
          ethers.constants.MaxUint256,
          ethers.constants.AddressZero,
          signature,
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'ETH_TRANSFER_FAILED');
      const blockIncludingClaim = await ethers.provider.getBlock('latest');
      const { transactions: latestTransactions } = blockIncludingClaim;
      const latestTransactionHash = latestTransactions[latestTransactions.length - 1];
      const latestTransactionReceipt = await ethers.provider.getTransactionReceipt(latestTransactionHash);
      const ethBalanceDefaultAdminAfterClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('100'));
      // check whether the block number increases by 1
      expect(blockIncludingClaim.number).to.equal(blockBeforeClaim.number + 1);
      // Although the transaction failed, it is still mined and included in a new block
      // So the sender of transaction still spends some ETH
      expect(ethBalanceDefaultAdminAfterClaim).to.equal(
        ethBalanceDefaultAdminBeforeClaim.sub(
          latestTransactionReceipt.gasUsed.mul(latestTransactionReceipt.effectiveGasPrice),
        ),
      );
    });

    it('Successfully revert when claim deadline expired', async () => {
      const eip712Data = {
        to: defaultAdminSigner.address,
        amount: toWei('10'),
        nonce: 0,
        deadline: ethers.constants.MaxUint256,
        tokenAddress: ethers.constants.AddressZero,
      };

      const signature = await defaultAdminSigner._signTypedData(domainData, eip712Types, eip712Data);
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('100'));
      const ethBalanceDefaultAdminBeforeClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      const blockBeforeClaim = await ethers.provider.getBlock('latest');
      // This should revert because proxy contract has only 100 ETH
      await expect(
        proxyBridge.claimFund(
          defaultAdminSigner.address,
          toWei('10'),
          0,
          // Deadline pass currentTime - 1 hr
          getCurrentTimeStamp() - 60 * 60 * 1,
          ethers.constants.AddressZero,
          signature,
        ),
      ).to.be.revertedWithCustomError(proxyBridge, 'EXPIRED_CLAIM');
      const blockIncludingClaim = await ethers.provider.getBlock('latest');
      const { transactions: latestTransactions } = blockIncludingClaim;
      const latestTransactionHash = latestTransactions[latestTransactions.length - 1];
      const latestTransactionReceipt = await ethers.provider.getTransactionReceipt(latestTransactionHash);
      const ethBalanceDefaultAdminAfterClaim = await ethers.provider.getBalance(defaultAdminSigner.address);
      expect(await ethers.provider.getBalance(proxyBridge.address)).to.equal(toWei('100'));
      // check whether the block number increases by 1
      expect(blockIncludingClaim.number).to.equal(blockBeforeClaim.number + 1);
      // Although the transaction failed, it is still mined and included in a new block
      // So the sender of transaction still spends some ETH
      expect(ethBalanceDefaultAdminAfterClaim).to.equal(
        ethBalanceDefaultAdminBeforeClaim.sub(
          latestTransactionReceipt.gasUsed.mul(latestTransactionReceipt.effectiveGasPrice),
        ),
      );
    });
  });
});
