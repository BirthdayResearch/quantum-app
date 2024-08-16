import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import { SupportedEVMTokenSymbols } from 'src/AppConfig';

import { TransactionsDto } from '../../../src/ethereum/EthereumInterface';
import { PrismaService } from '../../../src/PrismaService';
import { StartedDeFiChainStubContainer } from '../../defichain/containers/DeFiChainStubContainer';
import { BridgeServerTestingApp } from '../BridgeServerTestingApp';
import { mockEVMTransactions } from '../mockData/transactions';
import { buildTestConfig, TestingModule } from '../TestingModule';

function verifyFormat(parsedPayload: TransactionsDto) {
  expect(parsedPayload).toHaveProperty('txHash');
  expect(parsedPayload).toHaveProperty('token');
  expect(parsedPayload).toHaveProperty('blockHash');
  expect(parsedPayload).toHaveProperty('blockHeight');
  expect(parsedPayload).toHaveProperty('amount');
  expect(parsedPayload).toHaveProperty('timestamp');
  expect(parsedPayload).toHaveProperty('status');
  expect(parsedPayload).toHaveProperty('sendTransactionHash');
  expect(parsedPayload).toHaveProperty('unconfirmedSendTransactionHash');
}

describe('Transactions Service Test', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let prismaService: PrismaService;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();

    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          startedPostgresContainer,
        }),
      ),
    );

    const app = await testing.start();

    prismaService = app.get<PrismaService>(PrismaService);
    await prismaService.bridgeEventTransactions.createMany({ data: mockEVMTransactions });
  });

  afterAll(async () => {
    await testing.stop();
  });

  it(`should throw an error if both dates are invalid`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=abc&toDate=def`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.message).toStrictEqual([
      'fromDate must be a valid ISO 8601 date string',
      'toDate must be a valid ISO 8601 date string',
    ]);
  });

  it(`should throw an error if fromDate invalid`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=abc&toDate=2023-03-27`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.message).toStrictEqual(['fromDate must be a valid ISO 8601 date string']);
  });

  it(`should throw an error if toDate invalid`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2023-03-27&toDate=def`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.message).toStrictEqual(['toDate must be a valid ISO 8601 date string']);
  });

  it(`should throw an error if fromDate is in the future`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2033-03-15&toDate=2033-03-16`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.error).toStrictEqual('API call for Ethereum transactions was unsuccessful');
    expect(parsedPayload.message).toStrictEqual('Cannot query future date');
  });

  it(`should throw an error if toDate is in the future`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2023-03-15&toDate=2033-03-16`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.error).toStrictEqual('API call for Ethereum transactions was unsuccessful');
    expect(parsedPayload.message).toStrictEqual('Cannot query future date');
  });

  it(`should throw an error fromDate is more recent than toDate`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2023-03-15&toDate=2023-03-14`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload.statusCode).toStrictEqual(400);
    expect(parsedPayload.error).toStrictEqual('API call for Ethereum transactions was unsuccessful');
    expect(parsedPayload.message).toStrictEqual('fromDate cannot be more recent than toDate');
  });

  it(`should accept a valid fromDate & toDate pair`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2023-03-27&toDate=2023-03-29`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload).toHaveLength(mockEVMTransactions.length);

    // Two different ways of verifying payload content
    parsedPayload.forEach((p: any) => verifyFormat(p));

    parsedPayload.forEach((p: any) => {
      const {
        transactionHash,
        status,
        sendTransactionHash,
        createdAt,
        amount,
        tokenSymbol,
        blockHash,
        blockHeight,
        unconfirmedSendTransactionHash,
      } = mockEVMTransactions.filter((m) => m.transactionHash === p.txHash)[0];
      expect(p).toMatchObject(
        new TransactionsDto(
          transactionHash,
          tokenSymbol as SupportedEVMTokenSymbols,
          blockHash,
          blockHeight,
          amount,
          createdAt.toISOString(),
          status,
          sendTransactionHash,
          unconfirmedSendTransactionHash,
        ),
      );
    });
  });

  it(`should filter out dates`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactions?fromDate=2023-03-27&toDate=2023-03-27`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);

    expect(parsedPayload).toHaveLength(1);
    expect(parsedPayload[0].timestamp).toBe('2023-03-27T03:50:56.503Z');
  });
});
