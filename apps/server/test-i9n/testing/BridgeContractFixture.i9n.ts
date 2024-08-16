import { constants, Signer } from 'ethers';
import { HardhatNetwork, HardhatNetworkContainer, StartedHardhatNetworkContainer } from 'smartcontracts';

import { BridgeContractFixture } from './BridgeContractFixture';

describe('BridgeContractFixture Integration Tests', () => {
  let startedHardhatContainer: StartedHardhatNetworkContainer;
  let hardhatNetwork: HardhatNetwork;
  let bridgeContractFixture: BridgeContractFixture;
  let testEOASigner: Signer;
  let testEOAAddress: string;

  beforeAll(async () => {
    startedHardhatContainer = await new HardhatNetworkContainer().start();
    hardhatNetwork = await startedHardhatContainer.ready();

    ({ testWalletSigner: testEOASigner, testWalletAddress: testEOAAddress } = await hardhatNetwork.createTestWallet());

    bridgeContractFixture = new BridgeContractFixture(hardhatNetwork);
  });

  afterAll(async () => {
    await hardhatNetwork.stop();
  });

  /**
   * The following errors are thrown since the bridge proxy contract is not deployed and is the first
   * contract to be retrieved from the method.
   */
  describe('Contract not deployed errors', () => {
    it('should throw an error when trying to get contracts before deploying contract', () => {
      expect(() => bridgeContractFixture.contracts).toThrowError(
        `Contract '${BridgeContractFixture.Contracts.BridgeProxy.deploymentName}' has not been deployed yet`,
      );
    });

    it('should throw an error when trying to mint tokens before deploying contracts', async () => {
      await expect(() =>
        bridgeContractFixture.mintTokensToEOA(
          // arbitrary address
          constants.AddressZero,
        ),
      ).rejects.toThrowError(
        // first contract that it tries to get is the BridgeProxy
        `Contract '${BridgeContractFixture.Contracts.BridgeProxy.deploymentName}' has not been deployed yet`,
      );
    });

    it('should throw an error when trying to approve tokens on behalf of an EOA before deploying contracts', async () => {
      await expect(() =>
        bridgeContractFixture.mintTokensToEOA(
          // arbitrary address
          constants.AddressZero,
        ),
      ).rejects.toThrowError(
        // first contract that it tries to get is the BridgeProxy
        `Contract '${BridgeContractFixture.Contracts.BridgeProxy.deploymentName}' has not been deployed yet`,
      );
    });
  });

  it('should be able to deploy the Bridge related contracts successfully', async () => {
    // Given the Bridge contracts, When they are deployed
    await bridgeContractFixture.deployContracts();

    // Then the Bridge contracts should be deployed on chain
    const { bridgeProxy, bridgeImplementation, musdc, musdt } = bridgeContractFixture.contracts;
    // Check whether the bridgeProxy address is calculated correctly
    expect(bridgeContractFixture.calculatedBridgeProxyAddress).toStrictEqual(bridgeProxy.address);
    await expect(hardhatNetwork.ethersRpcProvider.getCode(bridgeProxy.address)).resolves.not.toStrictEqual('0x');
    await expect(hardhatNetwork.ethersRpcProvider.getCode(bridgeImplementation.address)).resolves.not.toStrictEqual(
      '0x',
    );
    await expect(hardhatNetwork.ethersRpcProvider.getCode(musdc.address)).resolves.not.toStrictEqual('0x');
    await expect(hardhatNetwork.ethersRpcProvider.getCode(musdt.address)).resolves.not.toStrictEqual('0x');
    expect(
      (await hardhatNetwork.ethersRpcProvider.getTransactionReceipt(bridgeContractFixture.wrongTxHash)).status,
    ).toStrictEqual(1);
  });

  it('should be able to mint tokens for a specified EOA', async () => {
    await bridgeContractFixture.mintTokensToEOA(testEOAAddress, constants.MaxInt256);
    const { musdt, musdc } = bridgeContractFixture.contracts;

    await expect(musdt.balanceOf(testEOAAddress)).resolves.toStrictEqual(constants.MaxInt256);
    await expect(musdc.balanceOf(testEOAAddress)).resolves.toStrictEqual(constants.MaxInt256);
  });

  it('should be able to the Bridge to spend tokens on behalf of a specified EOA', async () => {
    await bridgeContractFixture.approveBridgeForEOA(testEOASigner);
    const { bridgeProxy, musdt, musdc } = bridgeContractFixture.contracts;

    await expect(musdt.allowance(testEOAAddress, bridgeProxy.address)).resolves.toStrictEqual(constants.MaxInt256);
    await expect(musdc.allowance(testEOAAddress, bridgeProxy.address)).resolves.toStrictEqual(constants.MaxInt256);
  });
});
