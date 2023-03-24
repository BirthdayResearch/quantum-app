import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { BridgeV1, BridgeV1__factory, TimelockController } from '../generated';
import { deployContracts } from './testUtils/deployment';

const decimalTo32BytesHex = (num: Number) => {
  let hex: string = num.toString(16);
  while (hex.length < 64) {
    hex = `0${hex}`;
  }
  hex = `0x${hex}`;
  return hex;
};

describe('Sanity tests for Timelock Controller', () => {
  describe('Test change the Tx Fee', async () => {
    let timelockController: TimelockController;
    let proxyBridge: BridgeV1;
    let defaultAdminSigner: SignerWithAddress;
    let communityAddress: string;
    const ZERO_BYTES32 = `0x${'0'.repeat(64)}`;
    const firstSalt = decimalTo32BytesHex(0);
    const BridgeV1Interface = BridgeV1__factory.createInterface();
    const callDataForChangeTxFee = BridgeV1Interface.encodeFunctionData('changeTxFee', [1000]);

    it('Schedule successfully', async () => {
      ({ proxyBridge, defaultAdminSigner, communityAddress } = await loadFixture(deployContracts));
      const TimelockControllerFactory = await ethers.getContractFactory('TimelockController');
      timelockController = await TimelockControllerFactory.deploy(
        // minDelay
        24 * 60 * 60,
        // list of proposers
        [defaultAdminSigner.address],
        // list of executors
        [defaultAdminSigner.address],
        // admin of the timelock contract, set it to zero so that configuration of roles
        // can only be done via timelock proposals
        ethers.constants.AddressZero,
      );
      // grant defaultAdminRole to the timelockController
      await proxyBridge.grantRole(ZERO_BYTES32, timelockController.address);
      // calculate the id of the operation
      const firstOperationId = await timelockController.hashOperation(
        proxyBridge.address,
        0,
        callDataForChangeTxFee,
        // predecessor to equal to 0, don't care about dependencies
        ZERO_BYTES32,
        // salt
        firstSalt,
      );
      // set delay so that can only execute after (next_block).timestamp + 25 * 60 * 60
      await expect(
        timelockController.schedule(
          proxyBridge.address,
          0,
          callDataForChangeTxFee,
          ZERO_BYTES32,
          firstSalt,
          25 * 60 * 60,
        ),
      )
        .to.emit(timelockController, 'CallScheduled')
        .withArgs(firstOperationId, 0, proxyBridge.address, 0, callDataForChangeTxFee, ZERO_BYTES32, 25 * 60 * 60);
    });

    it('Fail when executing too early', async () => {
      await expect(
        timelockController.execute(proxyBridge.address, 0, callDataForChangeTxFee, ZERO_BYTES32, firstSalt),
      ).to.revertedWith('TimelockController: operation is not ready');
    });

    it('Increase time and execute successfully ', async () => {
      // Mines a new block whose timestamp is 48 * 60 * 60 after the latest block's timestamp
      await time.increase(48 * 60 * 60);
      await timelockController.execute(proxyBridge.address, 0, callDataForChangeTxFee, ZERO_BYTES32, firstSalt);
      expect(await proxyBridge.transactionFee()).to.equal(1000);
      // calculate the id of the operation
      const firstOperationId = await timelockController.hashOperation(
        proxyBridge.address,
        0,
        callDataForChangeTxFee,
        ZERO_BYTES32,
        firstSalt,
      );
      expect(await timelockController.getTimestamp(firstOperationId)).to.equal(1);
    });

    it('Re-schedule an already registered operation ', async () => {
      await expect(
        timelockController.schedule(
          proxyBridge.address,
          0,
          callDataForChangeTxFee,
          ZERO_BYTES32,
          firstSalt,
          25 * 60 * 60,
        ),
      ).to.revertedWith('TimelockController: operation already scheduled');
    });

    it('Change the salt, the operation should be successfully scheduled and later executed', async () => {
      const secondSalt = decimalTo32BytesHex(1);
      const secondOperationId = await timelockController.hashOperation(
        proxyBridge.address,
        0,
        callDataForChangeTxFee,
        ZERO_BYTES32,
        secondSalt,
      );
      await timelockController.schedule(
        proxyBridge.address,
        0,
        callDataForChangeTxFee,
        ZERO_BYTES32,
        secondSalt,
        25 * 60 * 60,
      );
      // Mines a new block whose timestamp is 48 * 60 * 60 after the latest block's timestamp
      await time.increase(48 * 60 * 60);
      await timelockController.execute(proxyBridge.address, 0, callDataForChangeTxFee, ZERO_BYTES32, secondSalt);
      expect(await proxyBridge.transactionFee()).to.equal(1000);
      expect(await timelockController.getTimestamp(secondOperationId)).to.equal(1);
    });

    it('Successfully cancel the operation when it is not executed yet', async () => {
      const callDataForChangeTxFeeAddress = BridgeV1Interface.encodeFunctionData('changeTxFeeAddress', [
        defaultAdminSigner.address,
      ]);
      const thirdSalt = decimalTo32BytesHex(11);
      expect(thirdSalt).to.equal('0x000000000000000000000000000000000000000000000000000000000000000b');
      const thirdOperationId = await timelockController.hashOperation(
        proxyBridge.address,
        0,
        callDataForChangeTxFeeAddress,
        ZERO_BYTES32,
        thirdSalt,
      );
      await timelockController.schedule(
        proxyBridge.address,
        0,
        callDataForChangeTxFeeAddress,
        ZERO_BYTES32,
        thirdSalt,
        24 * 60 * 60,
      );
      expect(await timelockController.getTimestamp(thirdOperationId)).to.equal((await time.latest()) + 24 * 60 * 60);
      // Mines a new block whose timestamp is 48 * 60 * 60 after the latest block's timestamp
      await time.increase(48 * 60 * 60);
      await timelockController.cancel(thirdOperationId);
      expect(await timelockController.getTimestamp(thirdOperationId)).to.equal(0);
      expect(await timelockController.isOperation(thirdOperationId)).to.equal(false);
      expect(await proxyBridge.communityWallet()).to.equal(communityAddress);
    });
  });
});
