import { fromAddress } from '@defichain/jellyfish-address';
import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';

import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { PrismaService } from '../../src/PrismaService';
import { sleep } from '../helper/sleep';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from './containers/DeFiChainStubContainer';

describe('DeFiChain Address Integration Testing', () => {
  // Tests are slower because it's running 3 containers at the same time
  jest.setTimeout(3600000);
  let testing: BridgeServerTestingApp;
  let defichain: StartedDeFiChainStubContainer;
  let whaleURL: string;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let prismaService: PrismaService;
  let hotWalletAddress: string;
  let hotWallet: WhaleWalletAccount;
  const WALLET_ENDPOINT = `/defichain/wallet/`;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();

    defichain = await new DeFiChainStubContainer().start();
    whaleURL = await defichain.getWhaleURL();
    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { whaleURL, key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          startedPostgresContainer,
        }),
      ),
    );

    const app = await testing.start();
    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);
    const whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    hotWallet = await whaleWalletProvider.getHotWallet();
    hotWalletAddress = await hotWallet.getAddress();
  });

  afterAll(async () => {
    // teardown database
    await prismaService.deFiChainAddressIndex.deleteMany({});
    await testing.stop();
    await startedPostgresContainer.stop();
    await defichain.stop();
  });

  it('should be able to generate a wallet address', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
    });
    expect(initialResponse.statusCode).toStrictEqual(200);
    const response = JSON.parse(initialResponse.body);
    // db should have record of transaction
    const dbAddressDetail = await prismaService.deFiChainAddressIndex.findFirst({
      where: { address: response.address },
    });
    expect(dbAddressDetail?.address).toStrictEqual(response.address);
    expect(dbAddressDetail?.createdAt.toISOString()).toStrictEqual(response.createdAt);
    expect(dbAddressDetail?.refundAddress).toStrictEqual(response.refundAddress);
    expect(dbAddressDetail?.hotWalletAddress).toStrictEqual(hotWalletAddress);

    const decodedAddress = fromAddress(response.address, 'regtest');
    expect(decodedAddress).not.toBeUndefined();
  });

  it('should be able to generate a wallet address for a specific network', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
    });

    expect(initialResponse.statusCode).toStrictEqual(200);
    // will return undefined if the address is not a valid address or not a network address
    const response = JSON.parse(initialResponse.body);
    const decodedAddress = fromAddress(response.address, 'mainnet');
    expect(decodedAddress).toBeUndefined();
  });

  it('should be able to fail rate limiting for generating addresses', async () => {
    // await 1min before continuing further
    await sleep(60000);
    for (let x = 0; x < 6; x += 1) {
      const initialResponse = await testing.inject({
        method: 'GET',
        url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
      });

      expect(initialResponse.statusCode).toStrictEqual(x < 5 ? 200 : 429);
    }
    // await 1min before continuing further
    await sleep(60000);
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
    });

    expect(initialResponse.statusCode).toStrictEqual(200);
  });

  it('should throw error while calling without refund address while creating new address', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
    });
    expect(initialResponse.statusCode).toStrictEqual(400);
  });

  it('should be able to get address detail', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
    });
    expect(initialResponse.statusCode).toStrictEqual(200);
    const response = JSON.parse(initialResponse.body);
    const decodedAddress = fromAddress(response.address, 'regtest');
    expect(decodedAddress).not.toBeUndefined();
    const addressDetailsResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/${response.address}`,
    });
    expect(addressDetailsResponse.statusCode).toStrictEqual(200);
    const addressDetails = JSON.parse(addressDetailsResponse.body);
    expect(addressDetails.address).toStrictEqual(response.address);
  });

  it('should throw error while calling address detail with invalid address', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/random-address`,
    });
    expect(initialResponse.statusCode).toStrictEqual(500);
  });

  it('should be able to generate a wallet address from 2nd index with diff mnemonic ', async () => {
    const testing2 = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: {
            whaleURL,
            key: 'quiz toddler try base thrive veteran scout pumpkin turkey stick example uphold poverty connect clinic inner sunny autumn fish gift suspect possible source dish',
          },
          startedPostgresContainer,
        }),
      ),
    );
    const app = await testing2.start();

    const whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    const newHotWallet = await whaleWalletProvider.getHotWallet();
    const newHotWalletAddress = await newHotWallet.getAddress();
    await whaleWalletProvider.getHotWallet();
    const initialResponse = await testing2.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
    });
    expect(initialResponse.statusCode).toStrictEqual(200);
    const response = JSON.parse(initialResponse.body);
    // db should have record of transaction
    const dbAddressDetail = await prismaService.deFiChainAddressIndex.findFirst({
      where: { address: response.address },
    });
    expect(dbAddressDetail?.index).toStrictEqual(2);
    expect(dbAddressDetail?.address).toStrictEqual(response.address);
    expect(dbAddressDetail?.createdAt.toISOString()).toStrictEqual(response.createdAt);
    expect(dbAddressDetail?.refundAddress).toStrictEqual(response.refundAddress);
    expect(dbAddressDetail?.hotWalletAddress).toStrictEqual(newHotWalletAddress);

    const decodedAddress = fromAddress(response.address, 'regtest');
    expect(decodedAddress).not.toBeUndefined();
    await testing2.stop();
  });

  it.skip('should be able to handel concurrent request on', async () => {
    const promiseArr = Array(2)
      .fill(0)
      .map(() =>
        testing.inject({
          method: 'GET',
          url: `${WALLET_ENDPOINT}address/generate?refundAddress=bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g`,
        }),
      );
    const responses = await Promise.all(promiseArr);
    expect(responses.length).toStrictEqual(2);
    const successRes = responses.filter((res) => res.statusCode === 200);
    expect(successRes.length).toStrictEqual(1);
    const failureRes = responses.filter((res) => res.statusCode !== 200);
    expect(failureRes.length).toStrictEqual(1);
  });
});
