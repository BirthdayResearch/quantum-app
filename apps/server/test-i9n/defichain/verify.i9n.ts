import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import {
  BridgeV1,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
} from 'smartcontracts';

import { CustomErrorCodes } from '../../src/CustomErrorCodes';
import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { PrismaService } from '../../src/PrismaService';
import { BridgeContractFixture } from '../testing/BridgeContractFixture';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from './containers/DeFiChainStubContainer';

// TODO: Find a nestjs way of configuring throttle limit for tests
jest.mock('../../src/ThrottleLimitConfig', () => ({
  ThrottleLimitConfig: {
    limit: 20,
    ttl: 30,
  },
}));

describe('DeFiChain Verify fund Testing', () => {
  let testing: BridgeServerTestingApp;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let defichain: StartedDeFiChainStubContainer;
  let prismaService: PrismaService;

  let bridgeContract: BridgeV1;
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let bridgeContractFixture: BridgeContractFixture;
  let ethWalletAddress: string;
  let mwbtcContract: TestToken;

  // Tests are slower because it's running 3 containers at the same time
  jest.setTimeout(3600000);
  let whaleWalletProvider: WhaleWalletProvider;
  let localAddress: string;
  let wallet: WhaleWalletAccount;
  const WALLET_ENDPOINT = `/defichain/wallet/`;
  const VERIFY_ENDPOINT = `${WALLET_ENDPOINT}verify`;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    defichain = await new DeFiChainStubContainer().start();
    const whaleURL = await defichain.getWhaleURL();

    // Hardhat - get signer
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();
    bridgeContractFixture = new BridgeContractFixture(hardhatNetwork);
    ethWalletAddress = await hardhatNetwork.contractSigner.getAddress();
    await bridgeContractFixture.setup();
    ({ bridgeProxy: bridgeContract, musdt: mwbtcContract } =
      bridgeContractFixture.contractsWithAdminAndOperationalSigner);

    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: {
            whaleURL,
            key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC,
            transferFee: '0.003',
            dustUTXO: '0.001',
            supportedTokens: 'BTC,ETH',
          },
          startedHardhatContainer,
          testnet: {
            bridgeContractAddress: bridgeContract.address,
            ethWalletPrivKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // local hardhat wallet
          },
          startedPostgresContainer,
        }),
      ),
    );

    const app = await testing.start();

    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);

    whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    wallet = whaleWalletProvider.createWallet(2);
    localAddress = await wallet.getAddress();
  });

  afterAll(async () => {
    // teardown database
    await prismaService.deFiChainAddressIndex.deleteMany({});
    await startedPostgresContainer.stop();
    await testing.stop();
    await defichain.stop();
  });

  type MockedPayload = {
    amount: string;
    symbol: string;
    address: string;
    ethReceiverAddress: string;
    tokenAddress: string;
  };

  async function verify(mockedPayload: MockedPayload) {
    const initialResponse = await testing.inject({
      method: 'POST',
      url: `${VERIFY_ENDPOINT}`,
      payload: mockedPayload,
    });
    const response = JSON.parse(initialResponse.body);

    return response;
  }

  it('should throw error if symbol is not valid', async () => {
    const response = await verify({
      amount: '1',
      symbol: '_invalid_symbol_',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({
      error: 'Bad Request',
      message: ['symbol must be one of the following values: BTC, USDT, USDC, ETH, EUROC, DFI, MATIC, XCHF'],
      statusCode: 400,
    });
  });

  it('should throw error if address is invalid', async () => {
    const response = await verify({
      amount: '1',
      symbol: 'BTC',
      address: '_invalid_address_',
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotValid });
  });

  it('should throw error if address has zero balance', async () => {
    // Generate address (index = 2)
    await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
      query: {
        refundAddress: localAddress,
      },
    });

    const response = await verify({
      amount: '3',
      symbol: 'BTC',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.IsZeroBalance });
  });

  it('should throw error if address is not found in db', async () => {
    // Get address (not generated through API)
    const newWallet = whaleWalletProvider.createWallet(3);
    const newLocalAddress = await newWallet.getAddress();

    const response = await verify({
      amount: '2',
      symbol: 'BTC',
      address: newLocalAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotFound });
  });

  it('should throw error if balance did not match with the amount', async () => {
    // Generate address (index = 3)
    await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
      query: {
        refundAddress: localAddress,
      },
    });

    const newWallet = whaleWalletProvider.createWallet(3);
    const newLocalAddress = await newWallet.getAddress();

    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [newLocalAddress]: `3@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();

    const response = await verify({
      amount: '10',
      symbol: 'BTC',
      address: newLocalAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.BalanceNotMatched });
  });

  it('should throw error if address is not owned by the wallet', async () => {
    const randomAddress = 'bcrt1qg8m5rcgc9da0dk2dmj9zltvlc99s5qugs4nf2l';
    // Update with a random valid address (not owned by the wallet)
    const data = {
      address: randomAddress,
    };
    const newWallet = whaleWalletProvider.createWallet(3);
    const newLocalAddress = await newWallet.getAddress();
    await prismaService.deFiChainAddressIndex.update({ where: { address: newLocalAddress }, data });

    const response = await verify({
      amount: '3',
      symbol: 'BTC',
      address: randomAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AddressNotOwned });
  });

  it('should throw error if amount is invalid', async () => {
    const response = await verify({
      amount: '-3',
      symbol: 'BTC',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AmountNotValid });
  });

  it('should throw error if amount has more than 6 decimal place', async () => {
    const response = await verify({
      amount: '3.123456',
      symbol: 'BTC',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.AmountNotValid });
  });

  it('should throw error if token symbol is not supported', async () => {
    const response = await verify({
      amount: '3',
      symbol: 'USDT',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response).toStrictEqual({ isValid: false, statusCode: CustomErrorCodes.TokenSymbolNotSupported });
  });

  it('should throw error if confirmed block number is less than 35', async () => {
    // Generate address (index = 4)
    const newWallet = whaleWalletProvider.createWallet(4);
    const newLocalAddress = await newWallet.getAddress();

    await testing.inject({
      method: 'GET',
      url: `${WALLET_ENDPOINT}address/generate`,
      query: {
        refundAddress: localAddress,
      },
    });

    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [newLocalAddress]: `1@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock(); // Only waits for 10 blocks

    const response = await verify({
      amount: '1',
      symbol: 'BTC',
      address: newLocalAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response.isValid).toBeFalsy();
    expect(response.statusCode).toStrictEqual(CustomErrorCodes.IsBelowMinConfirmationRequired);
    expect(response.txnId).toBeDefined();
  });

  it('should verify fund in the wallet address and top up UTXO', async () => {
    const hotWallet = whaleWalletProvider.getHotWallet();
    const hotWalletAddress = await hotWallet.getAddress();

    // Send UTXO to Hot Wallet
    await defichain.playgroundRpcClient?.wallet.sendToAddress(hotWalletAddress, 1);
    await defichain.generateBlock();

    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [localAddress]: `10@BTC`,
        },
      ],
      'number',
    );
    await defichain.generateBlock(40);

    const response = await verify({
      amount: '10',
      symbol: 'BTC',
      address: localAddress,
      ethReceiverAddress: ethWalletAddress,
      tokenAddress: mwbtcContract.address,
    });

    expect(response.isValid).toBeTruthy();
    expect(response.signature).toBeDefined();
    expect(response.nonce).toBeDefined();
    expect(response.deadline).toBeDefined();
    expect(response.txnId).toBeDefined();

    // TODO: Fix flaky tests for UTXO
    /* await defichain.generateBlock();
                    expect(await defichain.whaleClient.address.getBalance(localAddress)).toStrictEqual(
                      new BigNumber('0.001').toFixed(8),
                    ); */
  });
});
