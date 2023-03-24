import { BigNumberish, ethers } from 'ethers';

import { EvmContractManager } from './EvmContractManager';
import type { StartedHardhatNetworkContainer } from './HardhatNetworkContainer';
import { toZeroStrippedHex } from './Utils';

/**
 * Class that exposes the methods available to the HardhatNetwork
 */
export class HardhatNetwork {
  readonly ethersRpcProvider: ethers.providers.StaticJsonRpcProvider;

  readonly contracts: EvmContractManager;

  readonly contractSigner: ethers.providers.JsonRpcSigner;

  constructor(
    private readonly startedHardhatContainer: StartedHardhatNetworkContainer,
    readonly contractDeployerAddress: string,
  ) {
    this.ethersRpcProvider = new ethers.providers.StaticJsonRpcProvider(startedHardhatContainer.rpcUrl);
    this.contractSigner = this.ethersRpcProvider.getSigner(contractDeployerAddress);
    this.contracts = new EvmContractManager(startedHardhatContainer, this.contractSigner, this.ethersRpcProvider);
  }

  /**
   * Runs cleanup logic and stops the started container as well. There is no need to stop the main container
   */
  async stop(): Promise<void> {
    try {
      // Clear up anything else that is potentially in the mempool
      await this.generate(50);
    } catch (e) {
      throw Error('HardhatNetwork.stop stops the StartedHardhatNetworkContainer as well');
    }
    // Arbitrarily short timeout to ensure that any dangling transactions are resolved
    // before the container stops and shuts down.
    await new Promise((resolve) => {
      setTimeout(resolve, 5_000);
    });
    await this.startedHardhatContainer.stop();
  }

  /**
   * Creates test wallet data and funds it with the maximum amount of Ether
   */
  async createTestWallet(): Promise<TestWalletData> {
    const testWalletAddress = ethers.Wallet.createRandom().address;
    await this.activateAccount(testWalletAddress);
    await this.fundAddress(testWalletAddress, ethers.constants.MaxInt256);
    return {
      testWalletAddress,
      testWalletSigner: this.ethersRpcProvider.getSigner(testWalletAddress),
    };
  }

  // Sets the address' balance to the specified amount. The Ganache EVM will mine a block before returning
  async fundAddress(address: string, amountToFund: BigNumberish): Promise<void> {
    // convert amount to fund to hex
    const amountToFundInHex = ethers.BigNumber.from(amountToFund).toHexString();
    const fundAccountStatus = await this.startedHardhatContainer.call('hardhat_setBalance', [
      address,
      toZeroStrippedHex(amountToFundInHex), // hardhat expects no leading zeroes
    ]);

    if (fundAccountStatus === false) {
      throw Error('Something went wrong with funding the account with the specified amount');
    }
  }

  /**
   * Activates an account so that transactions can be sent to and from this address
   * @param address
   */
  async activateAccount(address: string): Promise<void> {
    return this.startedHardhatContainer.call('hardhat_impersonateAccount', [address]);
  }

  /**
   * Mines the specified number of blocks
   * @param numBlocks
   */
  async generate(numBlocks: BigNumberish): Promise<void> {
    if (ethers.BigNumber.from(numBlocks).lte(ethers.constants.Zero)) {
      throw Error('Minimum of 1 block needs to be generated.');
    }

    await this.startedHardhatContainer.call('hardhat_mine', [toZeroStrippedHex(numBlocks)]);
  }

  /**
   * Returns an array of addresses representing the accounts that are initialised with the Hardhat node.
   *
   * These address assume that we are not modifying the default initialisation of the Hardhat node.
   * If such a use case exists, we need to re-look this method.
   */
  static get hardhatAccounts(): string[] {
    return [
      '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65',
      '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc',
      '0x976EA74026E726554dB657fA54763abd0C3a0aa9',
      '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955',
      '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f',
      '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720',
      '0xBcd4042DE499D14e55001CcbB24a551F3b954096',
      '0x71bE63f3384f5fb98995898A86B02Fb2426c5788',
      '0xFABB0ac9d68B0B445fB7357272Ff202C5651694a',
      '0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec',
      '0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097',
      '0xcd3B766CCDd6AE721141F452C550Ca635964ce71',
      '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
      '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E',
      '0xdD2FD4581271e230360230F9337D5c0430Bf44C0',
      '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199',
    ];
  }

  /**
   * Returns TestWalletData tied to a particular pre-defined address that is created when Hardhat initialises.
   * The difference between this and `createTestWallet` is that Hardhat knows the private keys to these
   * addresses, which is necessary for certain transactions
   *
   * @param index zero indexed, meaning that 0 is the first account. There are a total of 20 accounts.
   */
  getHardhatTestWallet(index: number): TestWalletData {
    const testWalletAddress = HardhatNetwork.hardhatAccounts[index];

    if (testWalletAddress === undefined) {
      throw Error('Please select an index from 0 to 19 (inclusive) when creating a hardhat wallet');
    }

    return {
      testWalletAddress,
      testWalletSigner: this.ethersRpcProvider.getSigner(testWalletAddress),
    };
  }

  /**
   * Convenience method to send ether from one address to another
   *
   * @param from the address the ether is being sent from
   * @param to the address the ether is being sent to
   * @param value the amount of ether being sent in wei
   *
   * @return the hash of the transaction
   *
   * @see https://www.investopedia.com/terms/w/wei.asp
   */
  async sendEther({ from, to, value }: SendEtherParams): Promise<string> {
    return this.startedHardhatContainer.call('eth_sendTransaction', [
      {
        from,
        to,
        value: toZeroStrippedHex(value),
      },
    ]);
  }
}

export interface SendEtherParams {
  from: string;
  to: string;
  value: BigNumberish;
}

export interface TestWalletData {
  testWalletAddress: string;
  testWalletSigner: ethers.providers.JsonRpcSigner;
}
