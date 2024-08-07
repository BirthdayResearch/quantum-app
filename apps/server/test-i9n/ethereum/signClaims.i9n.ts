import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import { EnvironmentNetwork } from '@waveshq/walletkit-core';
import {
  BridgeV1,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
} from 'smartcontracts';

import { TokenSymbol } from '../../src/defichain/model/VerifyDto';
import { WhaleWalletService } from '../../src/defichain/services/WhaleWalletService';
import { EVMTransactionConfirmerService } from '../../src/ethereum/services/EVMTransactionConfirmerService';
import { PrismaService } from '../../src/PrismaService';
import { StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { sleep } from '../helper/sleep';
import { BridgeContractFixture } from '../testing/BridgeContractFixture';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

describe('Sign Claims Tests', () => {
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let testing: BridgeServerTestingApp;
  let bridgeContract: BridgeV1;
  let bridgeContractFixture: BridgeContractFixture;
  let musdcContract: TestToken;
  let prismaService: PrismaService;
  let evmService: EVMTransactionConfirmerService;
  let whaleWalletService: WhaleWalletService;
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

    // initialize config variables
    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          defichain: { key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          startedHardhatContainer,
          testnet: {
            bridgeContractAddress: bridgeContract.address,
            ethWalletPrivKey: '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
          },
          startedPostgresContainer,
          usdcAddress: musdcContract.address,
        }),
      ),
    );
    const app = await testing.start();

    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);
    evmService = app.get<EVMTransactionConfirmerService>(EVMTransactionConfirmerService);
    whaleWalletService = app.get<WhaleWalletService>(WhaleWalletService);
  });

  afterAll(async () => {
    // teardown database
    await prismaService.deFiChainAddressIndex.deleteMany({});
    await startedPostgresContainer.stop();
    await hardhatNetwork.stop();
    await testing.stop();
  });

  it('should sign claim successfully and store details to database', async () => {
    const { address } = await whaleWalletService.generateAddress(
      'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g',
      EnvironmentNetwork.LocalPlayground,
    );
    const hardhatAccount = hardhatNetwork.getHardhatTestWallet(0);
    const claim = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '10',
      uniqueDfcAddress: address,
    });
    expect(claim.signature).toBeDefined();
    expect(claim.nonce).toBeDefined();
    expect(claim.deadline).toBeDefined();

    // Check that claim details exists in the database
    const dbRecord = await prismaService.deFiChainAddressIndex.findFirst({
      where: { address },
    });
    expect(dbRecord?.address).toStrictEqual(address);
    expect(dbRecord?.claimSignature).toStrictEqual(claim.signature);
    expect(dbRecord?.claimDeadline).toStrictEqual(claim.deadline.toString());
    expect(dbRecord?.claimNonce).toStrictEqual(claim.nonce.toString());
    expect(dbRecord?.claimAmount).toStrictEqual('10');
    expect(dbRecord?.ethReceiverAddress).toStrictEqual(hardhatAccount.testWalletAddress);
    expect(dbRecord?.tokenSymbol).toStrictEqual(TokenSymbol.BTC);
  });

  it('should not create a new claim if same dfc address is used', async () => {
    const { address } = await whaleWalletService.generateAddress(
      'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g',
      EnvironmentNetwork.LocalPlayground,
    );
    const hardhatAccount = hardhatNetwork.getHardhatTestWallet(0);
    const firstClaim = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '5',
      uniqueDfcAddress: address,
    });
    expect(firstClaim.signature).toBeDefined();
    expect(firstClaim.nonce).toBeDefined();
    expect(firstClaim.deadline).toBeDefined();

    const secondClaim = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '150',
      uniqueDfcAddress: address,
    });
    expect(secondClaim.signature).toBeDefined();
    expect(secondClaim.nonce).toBeDefined();
    expect(secondClaim.deadline).toBeDefined();

    // Claim details should be exactly the same
    expect(secondClaim.signature).toStrictEqual(firstClaim.signature);
    expect(secondClaim.nonce).toStrictEqual(firstClaim.nonce);
    expect(secondClaim.deadline).toStrictEqual(firstClaim.deadline);
  });

  it('should create two different claims when two different addresses is used', async () => {
    const { address: address1 } = await whaleWalletService.generateAddress(
      'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g',
      EnvironmentNetwork.LocalPlayground,
    );
    const hardhatAccount = hardhatNetwork.getHardhatTestWallet(0);
    const claim1 = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '3',
      uniqueDfcAddress: address1,
    });
    expect(claim1.signature).toBeDefined();
    expect(claim1.nonce).toBeDefined();
    expect(claim1.deadline).toBeDefined();

    await sleep(2000);
    const { address: address2 } = await whaleWalletService.generateAddress(
      'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g',
      EnvironmentNetwork.LocalPlayground,
    );
    const claim2 = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '1',
      uniqueDfcAddress: address2,
    });
    expect(claim2.signature).toBeDefined();
    expect(claim2.nonce).toBeDefined();
    expect(claim2.deadline).toBeDefined();
    expect(claim2.signature).not.toStrictEqual(claim1.signature);
    expect(claim2.deadline).not.toStrictEqual(claim1.deadline);
    // Same nonce will be returned since previous claim is not yet claimed
    expect(claim2.nonce).toStrictEqual(claim1.nonce);
  });

  it('should set claim deadline to 24 hours upon claim creation', async () => {
    const { address } = await whaleWalletService.generateAddress(
      'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g',
      EnvironmentNetwork.LocalPlayground,
    );
    const hardhatAccount = hardhatNetwork.getHardhatTestWallet(0);
    const claim = await evmService.signClaim({
      receiverAddress: hardhatAccount.testWalletAddress,
      tokenAddress: musdcContract.address,
      tokenSymbol: TokenSymbol.BTC,
      amount: '1.5',
      uniqueDfcAddress: address,
    });
    expect(claim.signature).toBeDefined();
    expect(claim.nonce).toBeDefined();
    expect(claim.deadline).toBeDefined();
    // Check that deadline should be within 24 hrs
    const timeAfter24hrs = Date.now() + 1000 * 60 * 60 * 24;
    const deadlineAfter24hrs = timeAfter24hrs + 30000; // add 30sec allowance
    expect(claim.deadline).toBeLessThanOrEqual(deadlineAfter24hrs);
  });
});
