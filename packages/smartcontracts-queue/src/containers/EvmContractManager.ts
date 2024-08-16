import { ethers, Signer } from 'ethers';

import type { StartedHardhatNetworkContainer } from './HardhatNetworkContainer';

/**
 * Class which encapsulates EVM contract logic. Tightly coupled to a HardhatNetworkContainer.
 *
 * @param container A started HardhatNetworkContainer
 * @param signer An ethers signer attached to deployed contracts by default
 * @param provider An ethers provider used to query the connected chain
 */
export class EvmContractManager {
  #deployedContracts = new Map<string, DeployedContract<any>>();

  constructor(
    private readonly startedHardhatContainer: StartedHardhatNetworkContainer,
    private readonly signer: ethers.Signer,
    private readonly provider: ethers.providers.Provider,
  ) {}

  /**
   * There is no need to wait for the contracts to be deployed since that is handled by the hardhat
   * task that deploys the contract
   *
   * @param deploymentName
   * @param contractName
   * @param abi
   * @param deployArgs
   * @param linkedLibraries
   */
  async deployContract<Abi extends ethers.BaseContract>({
    deploymentName,
    contractName,
    abi,
    deployArgs = [],
    linkedLibraries = undefined,
  }: DeployContractParams): Promise<Abi> {
    // Throws an error if name already exists as contract names should be unique
    if (this.isContractNameInUse(deploymentName)) {
      const existingContract = this.getDeployedContract<Abi>(deploymentName);
      throw Error(
        `Contract '${deploymentName}' has already been deployed at ${existingContract.address}. Please use another name for the contract.`,
      );
    }

    // Comma-separate any contract deployment arguments which were passed in
    // If there were no deployment arguments, do not pass in the deployargs flag
    const deployArgsFlags = deployArgs.length > 0 ? ['--deployargs', deployArgs.join(',')] : [];

    const linkedLibrariesFlags = linkedLibraries !== undefined ? ['--libraries', JSON.stringify(linkedLibraries)] : [];
    // The output of the deployContract task is the deployed contract's address
    const { output, exitCode } = await this.startedHardhatContainer.exec([
      'npx',
      'hardhat',
      // specify path to config file
      '--config',
      './src/hardhat.config.ts',
      // specify localhost network so that the contract is deployed to the already
      // running hardhat network instance
      '--network',
      'localhost',
      'deployContract',
      '--name',
      contractName,
      // Pass in any contract deployment arguments if any
      ...deployArgsFlags,
      // Pass in any necessary library links if any
      ...linkedLibrariesFlags,
    ]);

    const isBadExitCode = exitCode !== 0;
    if (isBadExitCode) {
      throw Error(`Hardhat contract deployment task exited with code ${exitCode}`);
    }

    // Outputs should only be valid EVM addresses. Anything else is considered an error, and
    // means that something went wrong with executing the hardhat contract deployment task
    if (!ethers.utils.isAddress(output.trim().split(' ')[0])) {
      throw Error(output);
    }

    // Enrich the contract with relevant metadata
    const deployedContract: DeployedContract<Abi> = {
      name: deploymentName,
      ref: new ethers.Contract(output.trim().split(' ')[0], abi, this.signer) as Abi,
      deploymentTxHash: output.trim().split(' ')[1],
    };
    // Register the contract for future access
    await this.registerDeployedContract(deployedContract);
    return deployedContract.ref;
  }

  getDeployedContracts(): Map<string, DeployedContract<any>> {
    return this.#deployedContracts;
  }

  getDeployedContract<Abi extends ethers.BaseContract>(deployedName: string, userSigner?: Signer): Abi {
    const contract = this.#deployedContracts.get(deployedName);
    if (contract === undefined) {
      throw new Error(`Contract '${deployedName}' has not been deployed yet`);
    }
    // Check if the signer instance is provided by the caller
    if (userSigner !== undefined) {
      if (!Signer.isSigner(userSigner)) {
        throw new Error('Signer provided is not valid');
      }
      return contract.ref.connect(userSigner);
    }
    return contract.ref;
  }

  async isContractDeployedOnChain(deployedName: string): Promise<boolean> {
    const contract = this.getDeployedContract(deployedName);
    return (await this.provider.getCode(contract.address)) !== '0x';
  }

  isContractNameInUse(contractName: string): boolean {
    return this.#deployedContracts.has(contractName);
  }

  getDeploymentTxHashForContract(deployedName: string): string {
    const contract = this.#deployedContracts.get(deployedName);
    if (contract === undefined) {
      throw new Error(`Contract '${deployedName}' has not been deployed yet`);
    }

    return contract.deploymentTxHash;
  }

  private registerDeployedContract(deployedContract: DeployedContract<any>): void {
    this.#deployedContracts.set(deployedContract.name, deployedContract);
  }
}

export interface DeployContractParams {
  deploymentName: string; // The name used to deploy the contract. Eg, `FooAvalancheStableCoin`
  contractName: string; // The actual name of the contract. Eg, `AvalancheStableCoin`
  abi: readonly Object[];
  deployArgs?: any[];
  // Deployed addresses of any necessary linked libraries for the contract. Eg, { ExampleLibrary: "0x...." }
  linkedLibraries?: Record<string, string>;
}

export interface DeployedContract<Abi extends ethers.BaseContract> {
  name: DeployContractParams['deploymentName'];
  ref: Abi;
  deploymentTxHash: string;
}
