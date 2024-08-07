import { EthereumTransactionStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import { ethers } from 'ethers';
import {
  BridgeV1,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
} from 'smartcontracts';

import { PrismaService } from '../../src/PrismaService';
import { StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { BridgeContractFixture } from '../testing/BridgeContractFixture';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

describe('Bridge Service Integration Tests', () => {
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let testing: BridgeServerTestingApp;
  let bridgeContract: BridgeV1;
  let bridgeContractFixture: BridgeContractFixture;
  let musdcContract: TestToken;
  let prismaService: PrismaService;
  let startedPostgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();

    bridgeContractFixture = new BridgeContractFixture(hardhatNetwork);
    await bridgeContractFixture.setup();

    // Using the default signer of the container to carry out tests
    ({ bridgeProxy: bridgeContract, musdc: musdcContract } =
      bridgeContractFixture.contractsWithAdminAndOperationalSigner);

    const { blockNumber: bridgeProxyDeploymentBlockNumber, transactionIndex: bridgeProxyDeploymentTransactionIndex } =
      await startedHardhatContainer.call('eth_getTransactionByHash', [bridgeContractFixture.deploymentTxHash]);
    // initialize config variables
    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          startedHardhatContainer,
          testnet: {
            bridgeContractAddress: bridgeContract.address,
            bridgeProxyDeploymentBlockNumber: bridgeProxyDeploymentBlockNumber.toString(),
            bridgeProxyDeploymentTransactionIndex: bridgeProxyDeploymentTransactionIndex.toString(),
          },
          startedPostgresContainer,
          usdcAddress: musdcContract.address,
        }),
      ),
    );
    const app = await testing.start();

    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    // teardown database
    await prismaService.bridgeEventTransactions.deleteMany({});
    await startedPostgresContainer.stop();
    await hardhatNetwork.stop();
    await testing.stop();
  });

  it('Validates that the symbol inputted is supported by the bridge', async () => {
    const txReceipt = await testing.inject({
      method: 'GET',
      url: `/ethereum/balance/invalid_symbol`,
    });
    expect(JSON.parse(txReceipt.body).error).toBe('Bad Request');
    expect(JSON.parse(txReceipt.body).message).toBe('Token: "invalid_symbol" is not supported');
    expect(JSON.parse(txReceipt.body).statusCode).toBe(400);
  });

  it('Validates that the transaction inputted is of the correct format', async () => {
    const txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: 'wrong_transaction_test',
      },
    });
    expect(JSON.parse(txReceipt.body).error).toBe('Bad Request');
    expect(JSON.parse(txReceipt.body).message).toBe('Invalid Ethereum transaction hash: wrong_transaction_test');
    expect(JSON.parse(txReceipt.body).statusCode).toBe(400);
  });

  it('Returns the starting usdc balance of the bridge (should be 0)', async () => {
    const balance = await testing.inject({
      method: 'GET',
      url: `/ethereum/balance/USDC`,
    });
    expect(JSON.parse(balance.body)).toStrictEqual(0);
  });
  it('Returns the starting eth balance of the bridge (should be 0)', async () => {
    const balance = await testing.inject({
      method: 'GET',
      url: `/ethereum/balance/ETH`,
    });
    expect(JSON.parse(balance.body)).toStrictEqual(0);
  });

  it('Checks if a transaction is confirmed, and stores it in the database', async () => {
    // Step 1: Call bridgeToDeFiChain(_defiAddress, _tokenAddress, _amount) function (bridge 100 USDC) and mine the block
    const transactionCall = await bridgeContract.bridgeToDeFiChain(
      ethers.constants.AddressZero,
      musdcContract.address,
      5,
    );

    // to test pending transaction (unmined block)
    let txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body).statusCode).toStrictEqual(404);
    expect(JSON.parse(txReceipt.body).message).toStrictEqual('Transaction is still pending');

    await hardhatNetwork.generate(1);

    // Step 2: db should not have record of transaction
    let transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });
    expect(transactionDbRecord).toStrictEqual(null);

    txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 0, isConfirmed: false });

    // Step 3: db should create a record of transaction with status='NOT_CONFIRMED', as number of confirmations = 0.
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.NOT_CONFIRMED);

    // Step 4: mine 65 blocks to make the transaction confirmed
    await hardhatNetwork.generate(65);

    // Step 5: service should update record in db with status='CONFIRMED', as number of confirmations now hit 65.
    txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 65, isConfirmed: true });

    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.CONFIRMED);
  });

  it('Returns the usdc balance of the bridge after bridging 5 usdc', async () => {
    const balance = await testing.inject({
      method: 'GET',
      url: `/ethereum/balance/USDC`,
    });

    // 18 dp because MUSDC contract is set at 18
    expect(JSON.parse(balance.body)).toStrictEqual(5e-18);
  });
});
