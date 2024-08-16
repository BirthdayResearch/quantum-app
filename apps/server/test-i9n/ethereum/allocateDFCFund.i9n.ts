import { WhaleWalletAccount } from '@defichain/whale-api-wallet';
import { ConfigService } from '@nestjs/config';
import { EthereumTransactionStatus } from '@prisma/client';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@stickyjs/testcontainers';
import BigNumber from 'bignumber.js';
import { ContractTransaction, ethers } from 'ethers';
import {
  BridgeV1,
  HardhatNetwork,
  HardhatNetworkContainer,
  ShellBridgeV1__factory,
  StartedHardhatNetworkContainer,
  TestToken,
} from 'smartcontracts';

import { WhaleWalletProvider } from '../../src/defichain/providers/WhaleWalletProvider';
import { PrismaService } from '../../src/PrismaService';
import { DeFiChainStubContainer, StartedDeFiChainStubContainer } from '../defichain/containers/DeFiChainStubContainer';
import { sleep } from '../helper/sleep';
import { BridgeContractFixture } from '../testing/BridgeContractFixture';
import { BridgeServerTestingApp } from '../testing/BridgeServerTestingApp';
import { buildTestConfig, TestingModule } from '../testing/TestingModule';

describe('Bridge Service Allocate DFC Fund Integration Tests', () => {
  jest.setTimeout(3600000);
  const address = 'bcrt1q0c78n7ahqhjl67qc0jaj5pzstlxykaj3lyal8g';
  let defichain: StartedDeFiChainStubContainer;
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let testing: BridgeServerTestingApp;
  let bridgeContract: BridgeV1;
  let bridgeContractFixture: BridgeContractFixture;
  let musdcContract: TestToken;
  let prismaService: PrismaService;
  let startedPostgresContainer: StartedPostgreSqlContainer;
  let whaleWalletProvider: WhaleWalletProvider;
  let fromWallet: string;
  let wallet: WhaleWalletAccount;
  let transactionCall: ContractTransaction;
  let config: ConfigService;

  // TODO: remove this and fix defichain.generateBlock(). Currently, it is not generating blocks as it is supposed to
  const generateDfcBlock = async (nblocks: number, timeout: number = 590000): Promise<void> => {
    const target = (await defichain.whaleClient.stats.get()).count.blocks + nblocks;

    // eslint-disable-next-line no-unsafe-optional-chaining
    return waitForCondition(
      async () => {
        // eslint-disable-next-line no-unsafe-optional-chaining
        const count = (await defichain.whaleClient?.stats.get()).count.blocks;
        if (count > target) {
          return true;
        }
        await defichain.generateBlock();
        return false;
      },
      timeout,
      100,
      'waitForGenerate',
    );
  };

  beforeAll(async () => {
    startedPostgresContainer = await new PostgreSqlContainer().start();
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();

    bridgeContractFixture = new BridgeContractFixture(hardhatNetwork);
    await bridgeContractFixture.setup();

    // Using the default signer of the container to carry out tests
    ({ bridgeProxy: bridgeContract, musdc: musdcContract } =
      bridgeContractFixture.contractsWithAdminAndOperationalSigner);
    defichain = await new DeFiChainStubContainer().start();
    const whaleURL = await defichain.getWhaleURL();
    const { blockNumber: bridgeProxyDeploymentBlockNumber, transactionIndex: bridgeProxyDeploymentTransactionIndex } =
      await startedHardhatContainer.call('eth_getTransactionByHash', [bridgeContractFixture.deploymentTxHash]);
    // initialize config variables
    testing = new BridgeServerTestingApp(
      TestingModule.register(
        buildTestConfig({
          startedHardhatContainer,
          defichain: { whaleURL, key: StartedDeFiChainStubContainer.LOCAL_MNEMONIC },
          ethereum: { transferFee: '0' },
          testnet: {
            bridgeContractAddress: bridgeContract.address,
            bridgeProxyDeploymentBlockNumber,
            bridgeProxyDeploymentTransactionIndex,
          },
          startedPostgresContainer,
          usdcAddress: musdcContract.address,
        }),
      ),
    );
    const app = await testing.start();
    config = app.get(ConfigService);

    whaleWalletProvider = app.get<WhaleWalletProvider>(WhaleWalletProvider);
    wallet = whaleWalletProvider.getHotWallet();
    fromWallet = await wallet.getAddress();

    // Top up UTXO
    await defichain.playgroundRpcClient?.wallet.sendToAddress(fromWallet, 1);
    await defichain.generateBlock();
    // Sends token to the address
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [fromWallet]: `20@USDC`,
        },
      ],
      'number',
    );
    await defichain.playgroundClient?.rpc.call(
      'sendtokenstoaddress',
      [
        {},
        {
          [fromWallet]: `10@ETH`,
        },
      ],
      'number',
    );
    await defichain.generateBlock();
    // init postgres database
    prismaService = app.get<PrismaService>(PrismaService);

    // Step 1: Call bridgeToDeFiChain(_defiAddress, _tokenAddress, _amount) function (bridge 1 USDC) and mine the block
    transactionCall = await bridgeContract.bridgeToDeFiChain(
      ethers.utils.toUtf8Bytes(address),
      musdcContract.address,
      new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)).toFixed(0),
    );
    await hardhatNetwork.generate(1);
  });

  afterAll(async () => {
    // teardown database
    await prismaService.bridgeEventTransactions.deleteMany({});
    await startedPostgresContainer.stop();
    await hardhatNetwork.stop();
    await testing.stop();
  });

  function deductTransferFee(amount: BigNumber): string {
    // Deduct fee
    const ethTransferFee = config.get('ethereum.transferFee');
    const amountLessFee = new BigNumber(amount).minus(amount.multipliedBy(ethTransferFee)).toFixed(8);

    return amountLessFee;
  }

  it('should fail api request before handleTransaction api call', async () => {
    const transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });
    expect(transactionDbRecord).toStrictEqual(null);
    const sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    const response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Transaction detail not available');
  });

  it('should fail api request when transaction is not yet confirmed', async () => {
    // Step 2: db should not have record of transaction
    const txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 0, isConfirmed: false });

    // Step 3: db should create a record of transaction with status='NOT_CONFIRMED', as number of confirmations = 0.
    const transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.NOT_CONFIRMED);

    const sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    const response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Transaction is not yet confirmed');
  });

  it('should fail api request when transaction is not yet confirmed and db entry gets updated with confirmed status', async () => {
    // update txn as confirmed manually
    await prismaService.bridgeEventTransactions.update({
      where: {
        transactionHash: transactionCall.hash,
      },
      data: {
        status: EthereumTransactionStatus.CONFIRMED,
      },
    });

    const sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    const response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Transaction is not yet confirmed with min block threshold');
    // reverted update of txn as confirmed manually
    await prismaService.bridgeEventTransactions.update({
      where: {
        transactionHash: transactionCall.hash,
      },
      data: {
        status: EthereumTransactionStatus.NOT_CONFIRMED,
      },
    });
  });

  it('should allocate USDC DFC fund by txnId to receiving address', async () => {
    // Step 4: mine 65 blocks to make the transaction confirmed
    await hardhatNetwork.generate(65);
    // Step 5: service should update record in db with status='CONFIRMED', as number of confirmations now hit 65.
    const txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 65, isConfirmed: true });

    // Step 6: call allocate DFC fund
    let sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });
    const res = JSON.parse(sendTransactionDetails.body);
    let transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });

    // Deduct fee
    const amountLessFee = deductTransferFee(new BigNumber(1));

    expect(transactionDbRecord?.tokenSymbol).toStrictEqual('USDC');
    expect(transactionDbRecord?.amount).toStrictEqual(amountLessFee);
    expect(transactionDbRecord?.unconfirmedSendTransactionHash).toStrictEqual(res.transactionHash);
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.CONFIRMED);

    // Step 7: Mine 35 blocks before updating sendTransactionHash
    await generateDfcBlock(35);

    sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });

    const resDFCConfirmed = JSON.parse(sendTransactionDetails.body);
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: transactionCall.hash },
    });

    expect(transactionDbRecord?.sendTransactionHash).toStrictEqual(resDFCConfirmed.transactionHash);

    // check token gets transferred to the address
    const listToken = await defichain.whaleClient?.address.listToken(address);
    const token = listToken.find((each) => each.id === '5');
    expect(token?.id).toStrictEqual('5');
    expect(new BigNumber(token?.amount ?? 0).toFixed(8)).toStrictEqual(amountLessFee);
    expect(token?.symbol).toStrictEqual('USDC');
  });

  it('should fail if given inaccurate transaction hash', async () => {
    const invalidTxnHash = 'invalidTxnHash';

    const txnDetails = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactionDetails?transactionHash=${invalidTxnHash}`,
    });
    const txnDetailsRes = JSON.parse(txnDetails.body);
    expect(txnDetails.statusCode).toStrictEqual(400);
    expect(txnDetailsRes?.message).toStrictEqual('Invalid Ethereum transaction hash: invalidTxnHash');
  });

  it('should return accurate information when transactionDetails endpoint is called', async () => {
    const amountLessFee = deductTransferFee(new BigNumber(1));

    const txnDetails = await testing.inject({
      method: 'GET',
      url: `/ethereum/transactionDetails?transactionHash=${transactionCall.hash}`,
    });
    const txnDetailsRes = JSON.parse(txnDetails.body);
    expect(new BigNumber(txnDetailsRes?.amount ?? 0).toFixed(8)).toStrictEqual(amountLessFee);
    expect(txnDetailsRes?.toAddress).toStrictEqual(address);
    expect(txnDetailsRes?.symbol).toStrictEqual('USDC');
  });

  it('should fail when fund already allocated', async () => {
    // Delay to workaround throttler exception
    await sleep(60000);

    const sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: transactionCall.hash,
      },
    });

    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    const response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Fund already allocated');
  });

  it('should fail when invalid address is provided as send address', async () => {
    await sleep(60000);
    // Step 1: Call bridgeToDeFiChain(_defiAddress, _tokenAddress, _amount) function (bridge 1 USDC) and mine the block
    const invalidTransactionCall = await bridgeContract.bridgeToDeFiChain(
      ethers.utils.toUtf8Bytes('df1q4q49nwn7s8l6fsdpkmhvf0als6jawktg8urd3u'),
      musdcContract.address,
      new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)).toFixed(0),
    );
    await hardhatNetwork.generate(1);

    // Step 2: db should not have record of transaction
    let transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: invalidTransactionCall.hash },
    });
    expect(transactionDbRecord).toStrictEqual(null);

    let txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: invalidTransactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 0, isConfirmed: false });

    // Step 3: db should create a record of transaction with status='NOT_CONFIRMED', as number of confirmations = 0.
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: invalidTransactionCall.hash },
    });
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.NOT_CONFIRMED);

    // Step 4: mine 65 blocks to make the transaction confirmed
    await hardhatNetwork.generate(65);

    // Check transaction is not yet confirmed error
    let sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: invalidTransactionCall.hash,
      },
    });
    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    let response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Transaction is not yet confirmed');

    // Step 5: service should update record in db with status='CONFIRMED', as number of confirmations now hit 65.
    txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: invalidTransactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 65, isConfirmed: true });

    // Step 6: call allocate DFC fund to update unconfirmedSendTransactionHash (requires 35 DFC confirmations)
    sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: invalidTransactionCall.hash,
      },
    });
    response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Invalid send address for DeFiChain');
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: invalidTransactionCall.hash },
    });
    expect(transactionDbRecord?.unconfirmedSendTransactionHash).toStrictEqual(null);
  });

  it('should allocate ETH DFC fund by txnId to receiving address', async () => {
    await sleep(60000);
    // Step 1: Call bridgeToDeFiChain(_defiAddress, _tokenAddress, _amount) function (bridge 1 ETH) and mine the block
    const ethTransactionCall = await bridgeContract.bridgeToDeFiChain(
      ethers.utils.toUtf8Bytes(address),
      ethers.constants.AddressZero,
      0,
      {
        value: ethers.utils.parseEther('1'),
      },
    );
    await hardhatNetwork.generate(1);

    // Step 2: db should not have record of transaction
    let transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: ethTransactionCall.hash },
    });
    expect(transactionDbRecord).toStrictEqual(null);

    let txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: ethTransactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 0, isConfirmed: false });

    // Step 3: db should create a record of transaction with status='NOT_CONFIRMED', as number of confirmations = 0.
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: ethTransactionCall.hash },
    });
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.NOT_CONFIRMED);

    // Step 4: mine 65 blocks to make the transaction confirmed
    await hardhatNetwork.generate(65);

    // Check transaction is not yet confirmed error
    let sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: ethTransactionCall.hash,
      },
    });
    expect(sendTransactionDetails.statusCode).toStrictEqual(500);
    const response = JSON.parse(sendTransactionDetails.body);
    expect(response.error).toContain('Transaction is not yet confirmed');

    // Step 5: service should update record in db with status='CONFIRMED', as number of confirmations now hit 65.
    txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: ethTransactionCall.hash,
      },
    });
    expect(JSON.parse(txReceipt.body)).toStrictEqual({ numberOfConfirmations: 65, isConfirmed: true });

    // Step 6: call allocate DFC fund to update unconfirmedSendTransactionHash (requires 35 DFC confirmations)
    sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: ethTransactionCall.hash,
      },
    });
    const resEvmConfirmed = JSON.parse(sendTransactionDetails.body);
    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: ethTransactionCall.hash },
    });
    expect(transactionDbRecord?.unconfirmedSendTransactionHash).toStrictEqual(resEvmConfirmed.transactionHash);
    expect(transactionDbRecord?.status).toStrictEqual(EthereumTransactionStatus.CONFIRMED);

    // Step 7: Mine 35 blocks before updating sendTransactionHash
    await generateDfcBlock(35);

    sendTransactionDetails = await testing.inject({
      method: 'POST',
      url: `/ethereum/allocateDFCFund`,
      payload: {
        transactionHash: ethTransactionCall.hash,
      },
    });

    const resDFCConfirmed = JSON.parse(sendTransactionDetails.body);

    transactionDbRecord = await prismaService.bridgeEventTransactions.findFirst({
      where: { transactionHash: ethTransactionCall.hash },
    });

    expect(transactionDbRecord?.sendTransactionHash).toStrictEqual(resDFCConfirmed.transactionHash);

    // Deduct fee
    const amountLessFee = deductTransferFee(new BigNumber(1));

    // check token gets transferred to the address
    const listToken = await defichain.whaleClient?.address.listToken(address);
    const token = listToken.find((each) => each.id === '2');
    expect(token?.id).toStrictEqual('2');
    expect(new BigNumber(token?.amount ?? 0).toFixed(8)).toStrictEqual(amountLessFee);
    expect(token?.symbol).toStrictEqual('ETH');
  });

  it('transaction should go through when transaction is from quantum deployed smart contract', async () => {
    transactionCall = await bridgeContract.bridgeToDeFiChain(ethers.constants.AddressZero, musdcContract.address, 5);
    const validTxnHash = transactionCall.hash;
    await hardhatNetwork.generate(1);
    const txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: validTxnHash,
      },
    });
    const respBody = JSON.parse(txReceipt.body);
    expect(respBody).toStrictEqual({ isConfirmed: false, numberOfConfirmations: 0 });
  });

  it('transaction handling should throw error for transaction that is not from quantum deployed smart contract', async () => {
    // Given any random arbitrary EOA
    const signer = ethers.Wallet.createRandom().connect(hardhatNetwork.ethersRpcProvider);
    await hardhatNetwork.activateAccount(signer.address);
    await hardhatNetwork.generate(1);

    // Fund arbitrary EOA to allow it to make transactions. It has no other funds
    await hardhatNetwork.fundAddress(signer.address, ethers.utils.parseEther('1000'));
    await hardhatNetwork.generate(1);

    // Deploy shell contract
    const ShellContractDeployment = await new ShellBridgeV1__factory(signer).deploy();
    await hardhatNetwork.generate(1);
    const shellContract = await ShellContractDeployment.deployed();

    // Create shell transaction
    const tx = await shellContract.bridgeToDeFiChain(
      ethers.utils.toUtf8Bytes(address),
      musdcContract.address,
      new BigNumber(1).multipliedBy(new BigNumber(10).pow(18)).toFixed(0),
    );
    await hardhatNetwork.generate(100);
    const vulnerableTxHash = (await tx.wait(100)).transactionHash;

    // Attempt to kick-start the handling of the transaction
    const txReceipt = await testing.inject({
      method: 'POST',
      url: `/ethereum/handleTransaction`,
      payload: {
        transactionHash: vulnerableTxHash,
      },
    });

    const respBody = JSON.parse(txReceipt.body);
    expect(respBody.statusCode).toStrictEqual(400);
    expect(respBody.message).toStrictEqual('Contract Address in the Transaction Receipt is inaccurate');
  });
});

// eslint-disable-next-line no-unsafe-optional-chaining
async function waitForCondition(
  condition: () => Promise<boolean>,
  timeout: number,
  interval: number = 200,
  message: string = 'waitForCondition',
): Promise<void> {
  const expiredAt = Date.now() + timeout;

  // eslint-disable-next-line
  return await new Promise(async (resolve, reject) => {
    async function checkCondition() {
      const isReady = await condition().catch(() => false);
      if (isReady) {
        resolve();
      } else if (expiredAt < Date.now()) {
        reject(new Error(`${message} is not ready within given timeout of ${timeout}ms.`));
      } else {
        setTimeout(() => checkCondition(), interval);
      }
    }

    await checkCondition();
  });
}
