import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { StatsDto } from '../../../src/ethereum/EthereumInterface';
import { StartedDeFiChainStubContainer } from '../../defichain/containers/DeFiChainStubContainer';
import { BridgeServerTestingApp } from '../BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../TestingModule';

describe('Statistics Service Test', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;

  function verifyFormat(parsedPayload: StatsDto) {
    expect(parsedPayload).toHaveProperty('totalTransactions');
    expect(parsedPayload).toHaveProperty('confirmedTransactions');
    expect(parsedPayload).toHaveProperty('amountBridged');
    expect(parsedPayload).toHaveProperty('totalBridgedAmount');

    expect(parsedPayload.amountBridged).toHaveProperty('ETH');
    expect(parsedPayload.amountBridged).toHaveProperty('WBTC');
    expect(parsedPayload.amountBridged).toHaveProperty('USDT');
    expect(parsedPayload.amountBridged).toHaveProperty('USDC');
    expect(parsedPayload.amountBridged).toHaveProperty('EUROC');
    expect(parsedPayload.amountBridged).toHaveProperty('DFI');

    expect(parsedPayload.totalBridgedAmount).toHaveProperty('ETH');
    expect(parsedPayload.totalBridgedAmount).toHaveProperty('WBTC');
    expect(parsedPayload.totalBridgedAmount).toHaveProperty('USDT');
    expect(parsedPayload.totalBridgedAmount).toHaveProperty('USDC');
    expect(parsedPayload.totalBridgedAmount).toHaveProperty('EUROC');
    expect(parsedPayload.totalBridgedAmount).toHaveProperty('DFI');
  }

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

    await testing.start();
  });

  afterAll(async () => {
    await testing.stop();
  });

  it(`should return today's data if no param is given`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats`,
    });

    verifyFormat(JSON.parse(txReceipt.payload));
  });

  it(`should return given date's data`, async () => {
    const targetDate = '2023-03-11';

    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats?date=${targetDate}`,
    });

    verifyFormat(JSON.parse(txReceipt.payload));
  });

  it(`should throw an error if invalid date is provided`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats?date=abc`,
    });

    expect(JSON.parse(txReceipt.payload).status).toStrictEqual(500);
    expect(JSON.parse(txReceipt.payload).error).toStrictEqual(
      'API call for Ethereum statistics was unsuccessful: Invalid time value',
    );
  });

  it(`should throw an error if date parameter is missing`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats?date=`,
    });

    expect(JSON.parse(txReceipt.payload).status).toStrictEqual(500);
    expect(JSON.parse(txReceipt.payload).error).toStrictEqual(
      'API call for Ethereum statistics was unsuccessful: Invalid time value',
    );
  });

  it(`should throw an error if future date is provided`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats?date=2033-03-15`,
    });

    expect(JSON.parse(txReceipt.payload).status).toStrictEqual(500);
    expect(JSON.parse(txReceipt.payload).error).toStrictEqual(
      'API call for Ethereum statistics was unsuccessful: Cannot query future date',
    );
  });

  it(`should be correctly formatted`, async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/stats`,
    });

    const parsedPayload = JSON.parse(txReceipt.payload);
    verifyFormat(parsedPayload);
  });
});
