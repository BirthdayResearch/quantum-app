import { ethers } from 'ethers';

import { HardhatNetwork, HardhatNetworkContainer, StartedHardhatNetworkContainer } from '../src';

const TX_AUTOMINE_ENV_VAR = 'TRANSACTION_AUTOMINE';

describe('HardhatNetwork', () => {
  describe('StartedHardhatNetworkContainer behavior', () => {
    let startedHardhatContainer: StartedHardhatNetworkContainer;

    beforeAll(async () => {
      startedHardhatContainer = await new HardhatNetworkContainer().start();
    });

    afterAll(async () => {
      await startedHardhatContainer.stop();
    });

    it('should be connectable via RPC', async () => {
      const blockNum = await startedHardhatContainer.call('eth_chainId', []);
      // 1337 is the default chain id
      // Can also be found in the hardhat config in hardhat.config.ts in packages/smartcontracts-queue
      expect(blockNum).toStrictEqual(`0x${(1337).toString(16)}`);
    });

    it('should be able to connect via ethers', async () => {
      const provider = new ethers.providers.JsonRpcProvider(startedHardhatContainer.rpcUrl);
      const accounts = await provider.listAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('should have some pre-funded accounts', async () => {
      const [preFundedAccount] = await startedHardhatContainer.call('eth_accounts', []);
      const provider = new ethers.providers.JsonRpcProvider(startedHardhatContainer.rpcUrl);
      expect(await provider.getBalance(preFundedAccount)).not.toStrictEqual('0x0');
    });
  });

  describe('HardhatNetwork behaviour', () => {
    let hardhatNetwork: HardhatNetwork;
    let startedHardhatContainer: StartedHardhatNetworkContainer;

    beforeAll(async () => {
      startedHardhatContainer = await new HardhatNetworkContainer().start();
      hardhatNetwork = await startedHardhatContainer.ready();
    });

    afterAll(async () => {
      await hardhatNetwork.stop();
    });

    it('should error if not generating at least 1 block', async () => {
      await expect(() => hardhatNetwork.generate(0)).rejects.toThrow(/Minimum of 1 block needs to be generated./);
      await expect(() => hardhatNetwork.generate(-1)).rejects.toThrow(/Minimum of 1 block needs to be generated./);
      await hardhatNetwork.generate(1);
    });

    it('should be able to create a funded test wallet', async () => {
      const { testWalletAddress } = await hardhatNetwork.createTestWallet();
      const testWalletBalance = await hardhatNetwork.ethersRpcProvider.getBalance(testWalletAddress);
      expect(testWalletBalance.eq(ethers.constants.MaxInt256)).toStrictEqual(true);
    });

    describe('getHardhatTestWallet', () => {
      it('should return a test wallet connected to a pre-initialised Hardhat account', async () => {
        await expect(hardhatNetwork.getHardhatTestWallet(0).testWalletSigner.getAddress()).resolves.toStrictEqual(
          HardhatNetwork.hardhatAccounts[0],
        );
        await expect(hardhatNetwork.getHardhatTestWallet(19).testWalletSigner.getAddress()).resolves.toStrictEqual(
          HardhatNetwork.hardhatAccounts[19],
        );
      });

      it('should throw an error when trying to get a test wallet for a Hardhat account that does not exist', async () => {
        expect(() => hardhatNetwork.getHardhatTestWallet(-1)).toThrow('Please select an index from 0 to 19');
        expect(() => hardhatNetwork.getHardhatTestWallet(20)).toThrow('Please select an index from 0 to 19');
      });
    });
  });

  describe('Transaction auto-mining', () => {
    let container: HardhatNetworkContainer;
    let startedHardhatContainer: StartedHardhatNetworkContainer;
    let hardhatNetwork: HardhatNetwork;

    beforeEach(() => {
      container = new HardhatNetworkContainer();
    });

    afterEach(async () => {
      await hardhatNetwork.stop();
    });

    it('should auto-mine transactions when the TRANSACTION_AUTOMINE environment variable is true', async () => {
      startedHardhatContainer = await container.withEnvironment({ [TX_AUTOMINE_ENV_VAR]: 'true' }).start();
      hardhatNetwork = await startedHardhatContainer.ready();

      const { testWalletAddress } = await hardhatNetwork.createTestWallet();

      const txHash = await hardhatNetwork.sendEther({
        from: testWalletAddress,
        to: ethers.constants.AddressZero,
        value: 1000000,
      });

      const txReceipt = await hardhatNetwork.ethersRpcProvider.getTransactionReceipt(txHash);
      // should have 1 confirmation even though we have not mined any blocks
      expect(txReceipt.confirmations).toStrictEqual(1);
    });

    it('should not auto-mine transactions by default', async () => {
      startedHardhatContainer = await container.start();
      hardhatNetwork = await startedHardhatContainer.ready();

      const { testWalletAddress } = await hardhatNetwork.createTestWallet();

      const txHash = await hardhatNetwork.sendEther({
        from: testWalletAddress,
        to: ethers.constants.AddressZero,
        value: 1000000,
      });

      const txReceipt = await hardhatNetwork.ethersRpcProvider.getTransactionReceipt(txHash);
      // If the transaction has not been mined, null is returned.
      expect(txReceipt).toStrictEqual(null);

      await hardhatNetwork.generate(1);
      const txReceiptAfterMining = await hardhatNetwork.ethersRpcProvider.getTransactionReceipt(txHash);
      // Should now have 1 confirmation after explicitly mining a block
      expect(txReceiptAfterMining.confirmations).toStrictEqual(1);
    });
  });
});
