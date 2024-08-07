import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { BridgeServerTestingApp } from './BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from './TestingModule';

describe('Health Service Test', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;

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

  it('Health check service should be ok', async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/health`,
    });
    expect(JSON.parse(txReceipt.payload).status).toStrictEqual('ok');
  });

  it('Health check service should be error when database is down', async () => {
    await startedPostgresContainer.stop();

    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/health`,
    });

    expect(JSON.parse(txReceipt.payload).status).toStrictEqual('error');
    expect(JSON.parse(txReceipt.payload).error.database.status).toStrictEqual('down');
  });
});
