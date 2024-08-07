import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { sleep } from '../helper/sleep';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from './containers/DeFiChainStubContainer';

let defichain: StartedDeFiChainStubContainer;
let testing: BridgeServerTestingApp;
let startedPostgresContainer: StartedPostgreSqlContainer;

describe('DeFiChain Send Transaction Testing', () => {
  // Tests are slower because it's running 3 containers at the same time
  jest.setTimeout(3600000);
  let whaleWalletProvider: WhaleWalletProvider;
  let hotWalletAddress: string;
  let hotWallet: WhaleWalletAccount;
  const WALLET_ENDPOINT = `/defichain/wallet/balance/`;

  async function getBalance(tokenSymbol: string) {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}${tokenSymbol}`,
    });
    const response = JSON.parse(initialResponse.body);
    return response;
  }

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();

    defichain = await new DeFiChainStubContainer().start();
    const whaleURL = await defichain.getWhaleURL();
    const dynamicModule = TestingModule.register(
      buildTestConfig({
        defichain: { whaleURL, key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
        startedPostgresContainer,
      }),
    );
    testing = new BridgeServerTestingApp(dynamicModule);
    const app = await testing.start();

    whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    hotWallet = await whaleWalletProvider.getHotWallet();
    hotWalletAddress = await hotWallet.getAddress();
  });

  afterAll(async () => {
    await testing.stop();
    await startedPostgresContainer.stop();
    await defichain.stop();
  });

  it('Validates that the symbol inputted is supported by the bridge', async () => {
    const txReceipt = await getBalance('invalid_symbol');
    expect(txReceipt.error).toBe('Bad Request');
    expect(txReceipt.message).toBe('Token: "invalid_symbol" is not supported');
    expect(txReceipt.statusCode).toBe(400);
  });

  it('should be able to get balance of tokens in hotwallet', async () => {
    expect(await getBalance('BTC')).toStrictEqual(0);
    expect(await getBalance('USDC')).toStrictEqual(0);
    expect(await getBalance('USDT')).toStrictEqual(0);
    expect(await getBalance('ETH')).toStrictEqual(0);
    expect(await getBalance('DFI')).toStrictEqual(0);
    expect(await getBalance('EUROC')).toStrictEqual(0);
    // expect(await getBalance('MATIC')).toStrictEqual(0);

    // Send 10 BTC to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `10@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 10 USDC to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `10@USDC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 10 USDT to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `10@USDT`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 10 EUROC to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `10@EUROC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 10 MATIC to hotwallet
    // await defichain.playgroundClient?.rpc.call(
    //   'sendtokenstoaddress',
    //   [
    //     {},
    //     {
    //       [hotWalletAddress]: `10@MATIC`,
    //     },
    //   ],
    //   'number',
    // );
    // await defichain.generateBlock();

    // Send 10 ETH to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `10@ETH`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 10 UTXO to hotwallet
    await defichain.playgroundRpcClient?.wallet.sendToAddress(hotWalletAddress, 10);
    await defichain.generateBlock();

    expect(await getBalance('BTC')).toStrictEqual(10);
    expect(await getBalance('USDC')).toStrictEqual(10);
    expect(await getBalance('USDT')).toStrictEqual(10);
    expect(await getBalance('EUROC')).toStrictEqual(10);
    // expect(await getBalance('MATIC')).toStrictEqual(10);

    // Delay to workaround throttler exception
    await sleep(30000);

    expect(await getBalance('ETH')).toStrictEqual(10);
    expect(await getBalance('DFI')).toStrictEqual(10);
  });
});
