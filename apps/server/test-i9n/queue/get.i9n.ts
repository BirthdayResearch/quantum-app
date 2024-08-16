import { describe } from 'node:test';

import { DeFiChainTransactionStatus, QueueStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { PrismaService } from '../../src/PrismaService';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

describe('Get and List from EthereumQueue table', () => {
  let prismaService: PrismaService;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let testing: BridgeServerTestingApp;
  const txnHash = '0x09bf1c99b2383677993378227105c938d4fc2a2a8998d6cd35fccd75ee5b3831';
  const sendTxnHash = '0x09bf1c99b2383677993378227105c938d4fc2a2a8998d6cd35fccd75ee5b3839';

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();

    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          startedPostgresContainer,
        }),
      ),
    );

    const app = await testing.start();

    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);

    await prismaService.ethereumQueue.create({
      data: {
        transactionHash: txnHash,
        ethereumStatus: 'NOT_CONFIRMED',
        status: 'DRAFT',
        createdAt: '2023-04-20T06:14:43.847Z',
        updatedAt: '2023-04-20T06:28:17.185Z',
        amount: null,
        tokenSymbol: null,
        defichainAddress: '',
        expiryDate: '1970-01-01T00:00:00.000Z',
      },
    });

    await prismaService.adminEthereumQueue.create({
      data: {
        queueTransactionHash: txnHash,
        defichainStatus: DeFiChainTransactionStatus.NOT_CONFIRMED,
        sendTransactionHash: sendTxnHash,
      },
    });
  });

  afterAll(async () => {
    await prismaService.adminEthereumQueue.deleteMany({});
    await prismaService.ethereumQueue.deleteMany({});
    await startedPostgresContainer.stop();
    await testing.stop();
  });

  it('Should retrieve a single queue', async () => {
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/${txnHash}`,
    });

    const queue = JSON.parse(resp.body);
    expect(queue.transactionHash).toStrictEqual(txnHash);
    expect(queue.id).toStrictEqual('1');
    expect(queue.adminQueue.sendTransactionHash).toStrictEqual(sendTxnHash);
  });

  it('Should be able to retrieve single queue with specific status', async () => {
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/${txnHash}?status=DRAFT`,
    });

    const queue = JSON.parse(resp.body);
    expect(queue.transactionHash).toStrictEqual(txnHash);
    expect(queue.id).toStrictEqual('1');
    expect(queue.adminQueue.sendTransactionHash).toStrictEqual(sendTxnHash);
    expect(queue.status).toStrictEqual(QueueStatus.DRAFT);
  });

  it('Should have error when invalid transaction hash', async () => {
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/1234`,
    });

    expect(JSON.parse(resp.body).message).toStrictEqual('Invalid Ethereum transaction hash: 1234');
  });

  it('Should have error when valid transaction hash but queue not found', async () => {
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/0x09bf1c99b2383677993378227105c938d4fc2a2a8998d6cd35fccd75ee5b3867`,
    });
    expect(JSON.parse(resp.body).error).toStrictEqual('API call to get queue was unsuccessful: Queue not found');
  });

  it('Should have error when provided with invalid status in param', async () => {
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/0x09bf1c99b2383677993378227105c938d4fc2a2a8998d6cd35fccd75ee5b3831?status=INVALID_STATUS`,
    });

    const data = JSON.parse(resp.body);
    expect(data.message).toStrictEqual(
      'Invalid query parameter value. See the acceptable values: DRAFT, IN_PROGRESS, COMPLETED, ERROR, REJECTED, EXPIRED, REFUND_REQUESTED, REFUNDED',
    );
  });

  it('Should have error when too many request', async () => {
    let count = 1;
    while (count <= 5) {
      await testing.inject({
        method: 'GET',
        url: `/ethereum/queue/${txnHash}`,
      });
      count += 1;
    }

    // should get throttling error on the 6th
    const resp = await testing.inject({
      method: 'GET',
      url: `/ethereum/queue/${txnHash}`,
    });

    const data = JSON.parse(resp.body);
    expect(data.message).toStrictEqual('ThrottlerException: Too Many Requests');
  });
});
