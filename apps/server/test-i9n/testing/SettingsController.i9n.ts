import { ConfigService } from '@nestjs/config';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { Network, NETWORK_TOKENS_LIST } from '../../src/AppConfig';
import { BridgeServerTestingApp } from './BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from './TestingModule';

describe('Settings Controller Test', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let config: ConfigService;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();

    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { transferFee: '0.003', supportedTokens: 'BTC,ETH,USDT,USDC,EUROC,DFI,MATIC,XCHF' },
          ethereum: { transferFee: '0', supportedTokens: 'WBTC,ETH,USDT,USDC,EUROC,DFI,MATIC,XCHF' },
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

  it('Settings service should return the correct app settings for both DeFiChain and Ethereum', async () => {
    const response = await testing.inject({
      method: 'GET',
      url: `/settings`,
    });
    const settings = JSON.parse(response.payload);
    const dfcSupportedTokens = config.get('SUPPORTED_DFC_TOKENS')?.split(',');
    const evmSupportedTokens = config.get('SUPPORTED_EVM_TOKENS')?.split(',');

    expect(settings).toMatchObject({
      defichain: {
        transferFee: config.get('DFC_FEE_PERCENTAGE'),
        supportedTokens: dfcSupportedTokens,
        network: 'Local',
      },
      ethereum: {
        transferFee: config.get('ETH_FEE_PERCENTAGE'),
        supportedTokens: evmSupportedTokens,
      },
    });
  });

  it('should return correct supported tokens for both DeFiChain and Ethereum', async () => {
    // make a request to the endpoint
    const response = await testing.inject({
      method: 'GET',
      url: `/settings/supportedTokens`,
    });

    // parse the response
    const supportedTokens = JSON.parse(response.payload);

    // get the configured tokens
    const supportedDfcTokens = config.get('defichain.supportedTokens')?.split(',');
    const supportedEvmTokens = config.get('ethereum.supportedTokens')?.split(',');

    // map to the expected format
    const expectedSupportedTokens = NETWORK_TOKENS_LIST.map((network) => ({
      ...network,
      tokens: network.tokens.filter((token) =>
        (network.name === Network.Ethereum ? supportedEvmTokens : supportedDfcTokens).includes(token.tokenA.symbol),
      ),
    }));

    // compare the response with the expected value
    expect(supportedTokens).toEqual(expectedSupportedTokens);
  });
});
