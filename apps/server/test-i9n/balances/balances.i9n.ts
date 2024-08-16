import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import {
  BridgeV1,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
} from 'smartcontracts';

import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { PrismaService } from '../../src/PrismaService';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { BridgeContractFixture } from '../testing/BridgeContractFixture';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

let defichain: StartedDeFiChainStubContainer;
let testing: BridgeServerTestingApp;
let startedPostgresContainer: StartedPostgreSqlContainer;

describe('DeFiChain Send Transaction Testing', () => {
  // Tests are slower because it's running 3 containers at the same time
  jest.setTimeout(3600000);
  let whaleWalletProvider: WhaleWalletProvider;
  let hotWalletAddress: string;
  let hotWallet: WhaleWalletAccount;
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let bridgeContractFixture: BridgeContractFixture;
  let prismaService: PrismaService;
  let bridgeContract: BridgeV1;
  let musdcContract: TestToken;
  let musdtContract: TestToken;
  let mwbtcContract: TestToken;
  let meurocContract: TestToken;
  // let mmaticContract: TestToken;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();

    bridgeContractFixture = new BridgeContractFixture(hardhatNetwork);
    await bridgeContractFixture.setup();

    // Using the default signer of the container to carry out tests
    ({
      bridgeProxy: bridgeContract,
      musdc: musdcContract,
      musdt: musdtContract,
      mwbtc: mwbtcContract,
      meuroc: meurocContract,
      // mmatic: mmaticContract,
    } = bridgeContractFixture.contractsWithAdminAndOperationalSigner);

    defichain = await new DeFiChainStubContainer().start();
    const whaleURL = await defichain.getWhaleURL();

    const dynamicModule = TestingModule.register(
      buildTestConfig({
        startedHardhatContainer,
        testnet: {
          bridgeContractAddress: bridgeContract.address,
        },
        startedPostgresContainer,
        usdcAddress: musdcContract.address,
        usdtAddress: musdtContract.address,
        wbtcAddress: mwbtcContract.address,
        eurocAddress: meurocContract.address,
        // maticAddress: mmaticContract.address,
        defichain: { whaleURL, key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
      }),
    );
    testing = new BridgeServerTestingApp(dynamicModule);
    const app = await testing.start();

    whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    hotWallet = await whaleWalletProvider.getHotWallet();
    hotWalletAddress = await hotWallet.getAddress();
    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // teardown database
    await prismaService.bridgeEventTransactions.deleteMany({});
    await startedPostgresContainer.stop();
    await hardhatNetwork.stop();
    await defichain.stop();
    await testing.stop();
  });

  it('Should return zero balances of EVM and DFC hot wallets', async () => {
    const initialResponse = await testing.inject({
      method: 'GET',
      url: `/balances`,
    });
    const response = JSON.parse(initialResponse.body);
    expect(initialResponse.statusCode).toBe(200);
    expect(new BigNumber(response.DFC.BTC)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.DFC.USDC)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.DFC.USDT)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.DFC.ETH)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.DFC.DFI)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.DFC.EUROC)).toStrictEqual(new BigNumber(0));
    // expect(new BigNumber(response.DFC.MATIC)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.EVM.ETH)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.EVM.USDC)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.EVM.USDT)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.EVM.WBTC)).toStrictEqual(new BigNumber(0));
    expect(new BigNumber(response.EVM.EUROC)).toStrictEqual(new BigNumber(0));
    // expect(new BigNumber(response.EVM.MATIC)).toStrictEqual(new BigNumber(0));
  });

  it('When adding funds to DFC wallet Should return updated balances of DFC hot wallets ', async () => {
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

    // Send 9 USDC to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `9@USDC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 8 USDT to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `8@USDT`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 7 ETH to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `7@ETH`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 6 UTXO to hotwallet
    await defichain.playgroundRpcClient?.wallet.sendToAddress(hotWalletAddress, 6);
    await defichain.generateBlock();

    // Send 5 EUROC to hotwallet
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [hotWalletAddress]: `5@EUROC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    // Send 2 MATIC to hotwallet
    // await defichain.playgroundClient?.rpc.call(
    //   'sendtokenstoaddress',
    //   [
    //     {},
    //     {
    //       [hotWalletAddress]: `2@MATIC`,
    //     },
    //   ],
    //   'number',
    // );
    // await defichain.generateBlock();

    const initialResponse = await testing.inject({
      method: 'GET',
      url: `/balances`,
    });
    const response = JSON.parse(initialResponse.body);
    expect(initialResponse.statusCode).toBe(200);
    expect(new BigNumber(response.DFC.BTC)).toStrictEqual(new BigNumber(10));
    expect(new BigNumber(response.DFC.USDC)).toStrictEqual(new BigNumber(9));
    expect(new BigNumber(response.DFC.USDT)).toStrictEqual(new BigNumber(8));
    expect(new BigNumber(response.DFC.ETH)).toStrictEqual(new BigNumber(7));
    expect(new BigNumber(response.DFC.DFI)).toStrictEqual(new BigNumber(6));
    expect(new BigNumber(response.DFC.EUROC)).toStrictEqual(new BigNumber(5));
    // expect(new BigNumber(response.DFC.MATIC)).toStrictEqual(new BigNumber(2));
  });

  it('When adding funds to EVM wallet Should return updated balances of EVM hot wallets ', async () => {
    // Mint 10 USDC to hotwallet
    await musdcContract.mint(bridgeContract.address, ethers.utils.parseEther('10'));
    // Mint 9 USDT to hotwallet
    await musdtContract.mint(bridgeContract.address, ethers.utils.parseEther('9'));
    // Mint 8 WBTC to hotwallet
    await mwbtcContract.mint(bridgeContract.address, ethers.utils.parseEther('8'));
    // Mint 7 EUROC to hotwallet
    await meurocContract.mint(bridgeContract.address, ethers.utils.parseEther('7'));
    // Mint 2 MATIC to hotwallet
    // await mmaticContract.mint(bridgeContract.address, ethers.utils.parseEther('2'));
    // await hardhatNetwork.generate(1);

    const initialResponse = await testing.inject({
      method: 'GET',
      url: `/balances`,
    });
    const response = JSON.parse(initialResponse.body);
    expect(initialResponse.statusCode).toBe(200);
    expect(new BigNumber(response.EVM.USDC)).toStrictEqual(new BigNumber(10));
    expect(new BigNumber(response.EVM.USDT)).toStrictEqual(new BigNumber(9));
    expect(new BigNumber(response.EVM.WBTC)).toStrictEqual(new BigNumber(8));
    expect(new BigNumber(response.EVM.EUROC)).toStrictEqual(new BigNumber(7));
    // expect(new BigNumber(response.EVM.MATIC)).toStrictEqual(new BigNumber(2));
  });
});
