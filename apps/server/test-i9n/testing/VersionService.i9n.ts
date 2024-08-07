import { ConfigService } from '@nestjs/config';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { BridgeServerTestingApp } from './BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from './TestingModule';

describe('Version Service Test', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let config: ConfigService;

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
    config = app.get(ConfigService);
  });

  afterAll(async () => {
    await testing.stop();
  });

  it('Version service should return the correct APP_VERSION value', async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/version`,
    });
    const version = config.get('APP_VERSION');
    expect(JSON.parse(txReceipt.payload).v).toStrictEqual(version);
  });
});
