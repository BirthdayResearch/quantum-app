import { ethers } from 'ethers';

import {
  EvmContractManager,
  HardhatNetwork,
  HardhatNetworkContainer,
  StartedHardhatNetworkContainer,
  TestToken,
  TestToken__factory,
} from '../src';

describe('EvmContractManager', () => {
  const container = new HardhatNetworkContainer();
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let evmContractManager: EvmContractManager;
  const otherTestSigner = ethers.Wallet.createRandom();

  beforeAll(async () => {
    startedHardhatContainer = await container.start();
    hardhatNetwork = await startedHardhatContainer.ready();
    evmContractManager = hardhatNetwork.contracts;
  });

  afterAll(async () => {
    await hardhatNetwork.stop();
  });

  describe('Generic smart contract deployment', () => {
    it('should register and deploy an arbitrary smart contract with no contract deploy args', async () => {
      const contract = await evmContractManager.deployContract<TestToken>({
        deploymentName: 'TestToken',
        contractName: 'TestToken',
        deployArgs: ['TestToken', 'TT'],
        abi: TestToken__factory.abi,
      });
      await hardhatNetwork.generate(1);

      await expect(hardhatNetwork.ethersRpcProvider.getCode(contract.address)).resolves.not.toStrictEqual('0x');
    });

    it('should return a working deployed contract reference by deployed name', async () => {
      const contract = evmContractManager.getDeployedContract<TestToken>('TestToken');
      await expect(contract.resolvedAddress).resolves.toStrictEqual(expect.any(String));
    });

    it('should return all deployed contracts', async () => {
      expect(Object.fromEntries(evmContractManager.getDeployedContracts())).toStrictEqual({
        TestToken: {
          name: 'TestToken',
          ref: expect.anything(),
          deploymentTxHash: expect.anything(),
        },
      });
    });

    it('should throw error if attempting to get a contract that has not been deployed yet', async () => {
      await expect(async () => evmContractManager.getDeployedContract<TestToken>('AnotherContract')).rejects.toThrow(
        "Contract 'AnotherContract' has not been deployed yet",
      );
    });

    it('should throw error if contract name is already in use', async () => {
      await expect(
        evmContractManager.deployContract<TestToken>({
          deploymentName: 'TestToken', // already deployed above
          contractName: 'TestToken',
          abi: TestToken__factory.abi,
        }),
      ).rejects.toThrow(
        /Contract 'TestToken' has already been deployed at 0x.+\. Please use another name for the contract./,
      );
    });
  });

  describe('isContractDeployed', () => {
    it('should return false if a contract has not yet been successfully deployed to chain', async () => {
      await evmContractManager.deployContract<TestToken>({
        deploymentName: 'UnMinedContractDeployment',
        contractName: 'TestToken',
        deployArgs: ['TestToken', 'TT'],
        abi: TestToken__factory.abi,
      });
      expect(await evmContractManager.isContractDeployedOnChain('UnMinedContractDeployment')).toStrictEqual(false);
    });
  });

  describe('Attaching signer to deployed contracts', () => {
    it('should return a new contract with the otherTestSigner when passed as a param', async () => {
      const contract = evmContractManager.getDeployedContract<TestToken>('TestToken', otherTestSigner);
      expect(await contract.signer.getAddress()).toStrictEqual(otherTestSigner.address);
    });

    it('should not mutate the original contract in the object', async () => {
      const deployedContracts = evmContractManager.getDeployedContracts();
      for (const [, contract] of deployedContracts) {
        // all contracts in the map should have the new signer
        expect(await contract.ref.signer.getAddress()).toStrictEqual(await hardhatNetwork.contractSigner.getAddress());
      }
    });
  });
});
