import {
  BridgeQueue,
  BridgeQueue__factory,
  BridgeQueueProxy,
  BridgeQueueProxy__factory,
  EvmContractManager,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
  TestToken__factory,
} from '../src';

describe('Bridge Contract', () => {
  const container = new HardhatNetworkContainer();
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let evmContractManager: EvmContractManager;
  let defaultAdminAddress: string;
  let coldWalletAddress: string;
  let communityAddress: string;
  let bridgeUpgradeable: BridgeQueue;
  let bridgeProxy: BridgeQueueProxy;
  let testToken: TestToken;

  beforeAll(async () => {
    startedHardhatContainer = await container.start();
    hardhatNetwork = await startedHardhatContainer.ready();
    evmContractManager = hardhatNetwork.contracts;
    // Default and operational admin account
    ({ testWalletAddress: defaultAdminAddress } = await hardhatNetwork.createTestWallet());
    ({ testWalletAddress: coldWalletAddress } = await hardhatNetwork.createTestWallet());
    ({ testWalletAddress: communityAddress } = await hardhatNetwork.createTestWallet());

    // Deploying BridgeQueue contract
    testToken = await evmContractManager.deployContract<TestToken>({
      deploymentName: 'TestToken',
      contractName: 'TestToken',
      deployArgs: ['TT', 'MockToken'],
      abi: TestToken__factory.abi,
    });
    // Deploying BridgeQueue contract
    bridgeUpgradeable = await evmContractManager.deployContract<BridgeQueue>({
      deploymentName: 'BridgeQueue',
      contractName: 'BridgeQueue',
      abi: BridgeQueue__factory.abi,
    });
    await hardhatNetwork.generate(1);
    // deployment arguments for the Proxy contract
    const encodedData = BridgeQueue__factory.createInterface().encodeFunctionData('initialize', [
      defaultAdminAddress,
      coldWalletAddress, // cold wallet
      10, // 0.1% txn fee
      communityAddress, // flush funds back to admin
      [testToken.address],
    ]);
    // Deploying proxy contract
    bridgeProxy = await evmContractManager.deployContract<BridgeQueueProxy>({
      deploymentName: 'BridgeQueueProxy',
      contractName: 'BridgeQueueProxy',
      deployArgs: [bridgeUpgradeable.address, encodedData],
      abi: BridgeQueueProxy__factory.abi,
    });
    await hardhatNetwork.generate(1);
    bridgeUpgradeable = bridgeUpgradeable.attach(bridgeProxy.address);
    await hardhatNetwork.generate(1);
  });

  afterAll(async () => {
    await hardhatNetwork.stop();
  });

  describe('Proxy contract deployment', () => {
    it("Contract code should not be equal to '0x'", async () => {
      await expect(hardhatNetwork.ethersRpcProvider.getCode(bridgeUpgradeable.address)).resolves.not.toStrictEqual(
        '0x',
      );
    });
    it('Admin address should be Default Admin address', async () => {
      const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
      expect(await bridgeUpgradeable.hasRole(DEFAULT_ADMIN_ROLE, defaultAdminAddress)).toBe(true);
    });
    it('Community address should be  Community address', async () => {
      expect(await bridgeUpgradeable.communityWallet()).toBe(communityAddress);
    });
    it('Cold address should be cold wallet address', async () => {
      expect(await bridgeUpgradeable.coldWallet()).toBe(coldWalletAddress);
    });
    it('Successfully implemented the 0.1% txn fee', async () => {
      expect((await bridgeUpgradeable.transactionFee()).toString()).toBe('10');
    });
    it('Successfully added testToken as a supported token', async () => {
      expect(await bridgeUpgradeable.supportedTokens(testToken.address)).toBe(true);
    });
  });
});
