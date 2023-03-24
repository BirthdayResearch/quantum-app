import { ethers } from 'ethers';

import {
  BridgeProxy,
  BridgeProxy__factory,
  BridgeV1,
  BridgeV1__factory,
  EvmContractManager,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
} from '../src';

describe('Bridge Contract', () => {
  const container = new HardhatNetworkContainer();
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let evmContractManager: EvmContractManager;
  let defaultAdminAddress: string;
  let withdrawSignerAddress: string;
  let communityAddress: string;
  let bridgeUpgradeable: BridgeV1;
  let bridgeProxy: BridgeProxy;

  beforeAll(async () => {
    startedHardhatContainer = await container.start();
    hardhatNetwork = await startedHardhatContainer.ready();
    evmContractManager = hardhatNetwork.contracts;
    // Default and operational admin account
    ({ testWalletAddress: defaultAdminAddress } = await hardhatNetwork.createTestWallet());
    ({ testWalletAddress: withdrawSignerAddress } = await hardhatNetwork.createTestWallet());
    ({ testWalletAddress: communityAddress } = await hardhatNetwork.createTestWallet());
    // Deploying BridgeV1 contract
    bridgeUpgradeable = await evmContractManager.deployContract<BridgeV1>({
      deploymentName: 'BridgeV1',
      contractName: 'BridgeV1',
      abi: BridgeV1__factory.abi,
    });
    await hardhatNetwork.generate(1);
    // deployment arguments for the Proxy contract
    const encodedData = BridgeV1__factory.createInterface().encodeFunctionData('initialize', [
      defaultAdminAddress,
      withdrawSignerAddress,
      defaultAdminAddress,
      communityAddress,
      10, // 0.1% txn fee
      defaultAdminAddress, // flush funds back to admin
    ]);
    // Deploying proxy contract
    bridgeProxy = await evmContractManager.deployContract<BridgeProxy>({
      deploymentName: 'BridgeProxy',
      contractName: 'BridgeProxy',
      deployArgs: [bridgeUpgradeable.address, encodedData],
      abi: BridgeProxy__factory.abi,
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
    it('Withdraw address should be Withdraw address', async () => {
      const WITHDRAW_ROLE = ethers.utils.solidityKeccak256(['string'], ['WITHDRAW_ROLE']);
      expect(await bridgeUpgradeable.hasRole(WITHDRAW_ROLE, withdrawSignerAddress)).toBe(true);
    });
    it('Relayer address should be Default Admin address', async () => {
      expect(await bridgeUpgradeable.relayerAddress()).toBe(defaultAdminAddress);
    });
    it('Community address should be  Community address', async () => {
      expect(await bridgeUpgradeable.communityWallet()).toBe(communityAddress);
    });
    it('Successfully implemented the 0.1% txn fee', async () => {
      expect((await bridgeUpgradeable.transactionFee()).toString()).toBe('10');
    });
  });
});
