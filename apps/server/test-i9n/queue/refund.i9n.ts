import { QueueStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { ShellBridgeV1__factory } from 'smartcontracts';
import {
  BridgeQueue,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer as StartedHardhatNetworkQueueContainer,
  TestToken,
} from 'smartcontracts-queue';

import { PrismaService } from '../../src/PrismaService';
import { StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { sleep } from '../helper/sleep';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { QueueBridgeContractFixture } from '../testing/QueueBridgeContractFixture';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

let startedPostgresContainer: StartedPostgreSqlContainer;
let testing: BridgeServerTestingApp;

describe('Request Refund Testing', () => {
  let prismaService: PrismaService;
  let startedHardhatContainer: StartedHardhatNetworkQueueContainer;
  let hardhatNetwork: HardhatNetwork;
  let bridgeQueueContract: BridgeQueue;
  let bridgeContractFixture: QueueBridgeContractFixture;
  let musdcContract: TestToken;
  let validTxnHash: string;
  let validTxnHashNotInDB: string;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();

    bridgeContractFixture = new QueueBridgeContractFixture(hardhatNetwork);
    await bridgeContractFixture.setup();

    // Using the default signer of the container to carry out tests
    ({ queueBridgeProxy: bridgeQueueContract, musdc: musdcContract } =
      bridgeContractFixture.contractsWithAdminAndOperationalSigner);

    const transactionCall = await bridgeQueueContract.bridgeToDeFiChain(
      ethers.constants.AddressZero,
      musdcContract.address,
      5,
    );
    validTxnHash = transactionCall.hash;

    const transactionCallNotInDB = await bridgeQueueContract.bridgeToDeFiChain(
      ethers.constants.AddressZero,
      musdcContract.address,
      5,
    );

    validTxnHashNotInDB = transactionCallNotInDB.hash;

    const dynamicModule = TestingModule.register(
      buildTestConfig({
        defichain: { key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
        startedHardhatContainer,
        testnet: { bridgeQueueContractAddress: bridgeQueueContract.address },
        startedPostgresContainer,
        usdcAddress: musdcContract.address,
      }),
    );

    testing = new BridgeServerTestingApp(dynamicModule);
    const app = await testing.start();
    prismaService = app.get<PrismaService>(PrismaService);

    await prismaService.ethereumQueue.create({
      data: {
        transactionHash: validTxnHash,
        ethereumStatus: 'NOT_CONFIRMED',
        status: 'EXPIRED',
        createdAt: '2023-04-20T06:14:43.847Z',
        updatedAt: '2023-04-20T06:28:17.185Z',
        amount: null,
        tokenSymbol: null,
        defichainAddress: '',
        expiryDate: '1970-01-01T00:00:00.000Z',
      },
    });
  });

  afterAll(async () => {
    await prismaService.ethereumQueue.deleteMany({});
    await startedPostgresContainer.stop();
    await testing.stop();
  });

  it('Should throw error when transaction is not from quantum deployed smart contract', async () => {
    // Given any random arbitrary EOA
    const signer = ethers.Wallet.createRandom().connect(hardhatNetwork.ethersRpcProvider);
    await hardhatNetwork.activateAccount(signer.address);
    await hardhatNetwork.generate(1);

    // Fund arbitrary EOA to allow it to make transactions. It has no other funds
    await hardhatNetwork.fundAddress(signer.address, ethers.utils.parseEther('1000'));
    await hardhatNetwork.generate(1);

    // Deploy shell contract
    const ShellContractDeployment = await new ShellBridgeV1__factory(signer).deploy();
    await hardhatNetwork.generate(1);
    const shellContract = await ShellContractDeployment.deployed();

    // Create shell transaction
    const address = 'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g';
    const tx = await shellContract.bridgeToDeFiChain(
      ethers.utils.toUtf8Bytes(address),
      musdcContract.address,
      new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)).toFixed(0),
    );
    await hardhatNetwork.generate(100);
    const vulnerableTxHash = (await tx.wait(100)).transactionHash;

    await prismaService.ethereumQueue.create({
      data: {
        transactionHash: vulnerableTxHash,
        ethereumStatus: 'NOT_CONFIRMED',
        status: QueueStatus.EXPIRED,
        createdAt: '2023-04-20T06:14:43.847Z',
        updatedAt: '2023-04-20T06:28:17.185Z',
        amount: null,
        tokenSymbol: null,
        defichainAddress: '',
        expiryDate: '1970-01-01T00:00:00.000Z',
      },
    });

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: vulnerableTxHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual(
      'API call for refund was unsuccessful: Contract Address in the Transaction Receipt is inaccurate',
    );
  });

  it('Should throw error when requesting refund for transaction that is in DRAFT status', async () => {
    await hardhatNetwork.generate(65);
    await prismaService.ethereumQueue.update({
      where: { transactionHash: validTxnHash },
      data: { status: QueueStatus.DRAFT },
    });
    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual('API call for refund was unsuccessful: Unable to request refund for queue');
  });

  it('Should throw error when requesting refund for transaction that is in COMPLETED status', async () => {
    await prismaService.ethereumQueue.update({
      where: { transactionHash: validTxnHash },
      data: { status: QueueStatus.COMPLETED },
    });

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual('API call for refund was unsuccessful: Unable to request refund for queue');
  });

  it('Should throw error when requesting refund for transaction that is in REFUNDED status', async () => {
    await prismaService.ethereumQueue.update({
      where: { transactionHash: validTxnHash },
      data: { status: QueueStatus.REFUNDED },
    });

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual('API call for refund was unsuccessful: Unable to request refund for queue');
  });

  it('Should throw error when requesting refund for transaction that is in REFUND_REQUESTED status', async () => {
    await prismaService.ethereumQueue.update({
      where: { transactionHash: validTxnHash },
      data: { status: QueueStatus.REFUND_REQUESTED },
    });

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual('API call for refund was unsuccessful: Unable to request refund for queue');
  });

  it('Should throw error when requesting refund for transaction that is in REJECTED status', async () => {
    await sleep(1 * 60 * 1000); // sleep for 1 minute to reset throttle
    await prismaService.ethereumQueue.update({
      where: { transactionHash: validTxnHash },
      data: { status: QueueStatus.REJECTED },
    });

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual('API call for refund was unsuccessful: Unable to request refund for queue');
  });

  it('Should throw error when requesting refund for transaction that is in IN_PROGRESS status and current date < expired date', async () => {
    // set expiry date to be 1 day > current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.IN_PROGRESS },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual(
      'API call for refund was unsuccessful: Refund requests for the queue cannot be made at the moment as it has been less than 72 hours since the queue was created.',
    );
  });

  it('Should throw error when requesting refund for transaction that is in ERROR status and current date < expired date', async () => {
    // set expiry date to be 1 day > current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.ERROR },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual(
      'API call for refund was unsuccessful: Refund requests for the queue cannot be made at the moment as it has been less than 72 hours since the queue was created.',
    );
  });

  it('Should throw error when requesting refund for transaction that is in EXPIRED status and current date < expired date', async () => {
    // set expiry date to be 1 day > current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.EXPIRED },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.error).toEqual(
      'API call for refund was unsuccessful: Refund requests for the queue cannot be made at the moment as it has been less than 72 hours since the queue was created.',
    );
  });

  it('Should be able to update queue status to REFUND_REQUESTED only when status is IN_PROGRESS status and current date > expired date', async () => {
    // set expiry date to be 1 day < current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.IN_PROGRESS },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.id).toEqual('1');
    expect(queue.transactionHash).toEqual(validTxnHash);
    expect(queue.status).toEqual(QueueStatus.REFUND_REQUESTED);
  });

  it('Should be able to update queue status to REFUND_REQUESTED only when status is ERROR status and current date > expired date', async () => {
    await sleep(1 * 60 * 1000); // sleep for 1 minute to reset throttle
    // set expiry date to be 1 day < current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.ERROR },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.id).toEqual('1');
    expect(queue.transactionHash).toEqual(validTxnHash);
    expect(queue.status).toEqual(QueueStatus.REFUND_REQUESTED);
  });

  it('Should be able to update queue status to REFUND_REQUESTED only when status is `Expired` and current date > expired date', async () => {
    // set expiry date to be 1 day < current date
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() - 1);

    await Promise.all([
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { status: QueueStatus.EXPIRED },
      }),
      prismaService.ethereumQueue.update({
        where: { transactionHash: validTxnHash },
        data: { expiryDate },
      }),
    ]);

    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHash,
      },
    });

    const queue = JSON.parse(resp.body);
    expect(queue.id).toEqual('1');
    expect(queue.transactionHash).toEqual(validTxnHash);
    expect(queue.status).toEqual(QueueStatus.REFUND_REQUESTED);
  });

  it('Should throw error when transaction exist but queue does not exist in DB', async () => {
    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: validTxnHashNotInDB,
      },
    });

    expect(resp.statusCode).toEqual(400);
    expect(JSON.parse(resp.body).error).toEqual('API call for refund was unsuccessful: Queue not found');
  });

  it('Should throw error when transaction does not exist', async () => {
    const nonExistentTxnHash = '0x09bf1c99b2383677993378227105c938d4fc2a2a8998d6cd35fccd75ee5b3835';
    await prismaService.ethereumQueue.create({
      data: {
        transactionHash: nonExistentTxnHash,
        ethereumStatus: 'NOT_CONFIRMED',
        status: 'EXPIRED',
        createdAt: '2023-04-20T06:14:43.847Z',
        updatedAt: '2023-04-20T06:28:17.185Z',
        amount: null,
        tokenSymbol: null,
        defichainAddress: '',
        expiryDate: '1970-01-01T00:00:00.000Z',
      },
    });
    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: nonExistentTxnHash,
      },
    });

    expect(resp.statusCode).toEqual(404);
    expect(JSON.parse(resp.body).error).toEqual('API call for refund was unsuccessful: Transaction is still pending');
  });

  it('Should throw error when transactionHash is invalid', async () => {
    const resp = await testing.inject({
      method: 'POST',
      url: `/ethereum/queue/refund`,
      payload: {
        transactionHash: '1234',
      },
    });

    expect(resp.statusCode).toEqual(400);
    expect(JSON.parse(resp.body).message).toEqual('Invalid Ethereum transaction hash: 1234');
  });
});
