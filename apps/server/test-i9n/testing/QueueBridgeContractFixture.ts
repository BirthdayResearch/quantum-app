import { BigNumberish, constants, Signer } from 'ethers';
import { getContractAddress } from 'ethers/lib/utils';
import {
  BridgeQueue,
  BridgeQueue__factory,
  BridgeQueueProxy,
  BridgeQueueProxy__factory,
  EvmContractManager,
  HardhatNetwork,
  TestToken,
  TestToken__factory,
} from 'smartcontracts-queue';

export class QueueBridgeContractFixture {
  private contractManager: EvmContractManager;

  // The default signer used to deploy contracts
  public defaultAdminSigner: Signer;

  public wrongTxHash: string;

  public calculatedBridgeQueueProxyAddress: string;

  public deploymentTxHash: string;

  constructor(private readonly hardhatNetwork: HardhatNetwork) {
    this.contractManager = hardhatNetwork.contracts;
    this.defaultAdminSigner = hardhatNetwork.contractSigner;
    this.wrongTxHash = '';
    this.calculatedBridgeQueueProxyAddress = '';
    this.deploymentTxHash = '';
  }

  static readonly Contracts = {
    BridgeQueueImplementation: { deploymentName: 'BridgeQueue', contractName: 'BridgeQueue' },
    BridgeQueueProxy: { deploymentName: 'BridgeQueueProxy', contractName: 'BridgeQueueProxy' },
    MockUSDT: { deploymentName: 'MockUSDT', contractName: 'TestToken' },
    MockUSDC: { deploymentName: 'MockUSDC', contractName: 'TestToken' },
    MockWBTC: { deploymentName: 'MockWBTC', contractName: 'TestToken' },
    MockEUROC: { deploymentName: 'MockEUROC', contractName: 'TestToken' },
    MockDFI: { deploymentName: 'MockDFI', contractName: 'TestToken' },
  };

  get contracts(): BridgeContracts {
    const bridgeQueueProxyContract = this.hardhatNetwork.contracts.getDeployedContract<BridgeQueueProxy>(
      QueueBridgeContractFixture.Contracts.BridgeQueueProxy.deploymentName,
    );

    return {
      // Proxy contract proxies all calls to the implementation contract
      queueBridgeProxy: BridgeQueue__factory.connect(bridgeQueueProxyContract.address, this.defaultAdminSigner),
      queueBridgeImplementation: this.hardhatNetwork.contracts.getDeployedContract<BridgeQueue>(
        QueueBridgeContractFixture.Contracts.BridgeQueueImplementation.deploymentName,
      ),
      musdt: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockUSDT.deploymentName,
      ),
      musdc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockUSDC.deploymentName,
      ),
      mwbtc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockWBTC.deploymentName,
      ),
      meuroc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockEUROC.deploymentName,
      ),
      dfi: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockDFI.deploymentName,
      ),
    };
  }

  getContractsWithSigner(userSigner: Signer): BridgeContracts {
    const bridgeQueueProxyContract = this.hardhatNetwork.contracts.getDeployedContract<BridgeQueueProxy>(
      QueueBridgeContractFixture.Contracts.BridgeQueueProxy.deploymentName,
    );
    return {
      // Proxy contract proxies all calls to the implementation contract
      queueBridgeProxy: BridgeQueue__factory.connect(bridgeQueueProxyContract.address, userSigner),
      queueBridgeImplementation: this.hardhatNetwork.contracts.getDeployedContract<BridgeQueue>(
        QueueBridgeContractFixture.Contracts.BridgeQueueImplementation.deploymentName,
        userSigner,
      ),
      musdt: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockUSDT.deploymentName,
        userSigner,
      ),
      musdc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockUSDC.deploymentName,
        userSigner,
      ),
      mwbtc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockWBTC.deploymentName,
        userSigner,
      ),
      meuroc: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockEUROC.deploymentName,
        userSigner,
      ),
      dfi: this.hardhatNetwork.contracts.getDeployedContract<TestToken>(
        QueueBridgeContractFixture.Contracts.MockDFI.deploymentName,
        userSigner,
      ),
    };
  }

  get contractsWithAdminAndOperationalSigner(): BridgeContracts {
    return this.getContractsWithSigner(this.defaultAdminSigner);
  }

  /**
   * Deploys the contracts, using the Signer of the HardhatContainer as the operational and admin address
   */
  async deployContracts(): Promise<BridgeContracts> {
    // Deploying MockBridgeQueue implementation contract
    const queueBridgeUpgradeable = await this.contractManager.deployContract<BridgeQueue>({
      deploymentName: QueueBridgeContractFixture.Contracts.BridgeQueueImplementation.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.BridgeQueueImplementation.contractName,
      abi: BridgeQueue__factory.abi,
    });
    await this.hardhatNetwork.generate(1);

    const adminAndOperationalAddress = await this.defaultAdminSigner.getAddress();

    // Deploy MockUSDT
    const musdt = await this.contractManager.deployContract<TestToken>({
      deploymentName: QueueBridgeContractFixture.Contracts.MockUSDT.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.MockUSDT.contractName,
      deployArgs: ['MockUSDT', 'MUSDT'],
      abi: TestToken__factory.abi,
    });

    // Deploy MockUSDC
    const musdc = await this.contractManager.deployContract<TestToken>({
      deploymentName: QueueBridgeContractFixture.Contracts.MockUSDC.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.MockUSDC.contractName,
      deployArgs: ['MockUSDC', 'MUSDC'],
      abi: TestToken__factory.abi,
    });

    // Deploy MockWBTC
    const mwbtc = await this.contractManager.deployContract<TestToken>({
      deploymentName: QueueBridgeContractFixture.Contracts.MockWBTC.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.MockWBTC.contractName,
      deployArgs: ['MockWBTC', 'MWBTC'],
      abi: TestToken__factory.abi,
    });

    // Deploy MockEUROC
    const meuroc = await this.contractManager.deployContract<TestToken>({
      deploymentName: QueueBridgeContractFixture.Contracts.MockEUROC.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.MockEUROC.contractName,
      deployArgs: ['MockWEUROC', 'MEURC'],
      abi: TestToken__factory.abi,
    });

    // Deploy MockDFI
    const dfi = await this.contractManager.deployContract<TestToken>({
      deploymentName: QueueBridgeContractFixture.Contracts.MockDFI.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.MockDFI.contractName,
      deployArgs: ['MockDFI', 'DFI'],
      abi: TestToken__factory.abi,
    });

    await this.hardhatNetwork.generate(1);

    // Deployment arguments for the Proxy contract
    const encodedData = BridgeQueue__factory.createInterface().encodeFunctionData('initialize', [
      // admin address
      adminAndOperationalAddress,
      // cold wallet address
      adminAndOperationalAddress,
      // 0.3% txn fee
      30,
      // Community address
      adminAndOperationalAddress,
      // Supported token addresses
      [musdt.address, musdc.address, mwbtc.address, meuroc.address, dfi.address, constants.AddressZero],
    ]);

    this.calculatedBridgeQueueProxyAddress = getContractAddress({
      from: adminAndOperationalAddress,
      nonce: (await this.defaultAdminSigner.getTransactionCount()) + 1,
    });

    this.wrongTxHash = (
      await this.defaultAdminSigner.sendTransaction({
        to: this.calculatedBridgeQueueProxyAddress,
        data: BridgeQueue__factory.createInterface().encodeFunctionData('bridgeToDeFiChain', [
          '0x',
          constants.AddressZero,
          10,
        ]),
      })
    ).hash;

    await this.hardhatNetwork.generate(1);

    // Deploying proxy contract
    const queueBridgeProxy = await this.contractManager.deployContract<BridgeQueueProxy>({
      deploymentName: QueueBridgeContractFixture.Contracts.BridgeQueueProxy.deploymentName,
      contractName: QueueBridgeContractFixture.Contracts.BridgeQueueProxy.deploymentName,
      deployArgs: [queueBridgeUpgradeable.address, encodedData],
      abi: BridgeQueueProxy__factory.abi,
    });
    await this.hardhatNetwork.generate(1);

    this.deploymentTxHash = this.contractManager.getDeploymentTxHashForContract(
      QueueBridgeContractFixture.Contracts.BridgeQueueProxy.deploymentName,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const queueBridge = BridgeQueue__factory.connect(queueBridgeProxy.address, this.defaultAdminSigner);

    return this.contracts;
  }

  /**
   * Mints MUSDC, MUSDT, MWBTC And MEURC tokens to an EOA
   */
  async mintTokensToEOA(address: string, amount: BigNumberish = constants.MaxInt256): Promise<void> {
    const { musdc, musdt, mwbtc, meuroc, dfi } = this.getContractsWithSigner(this.defaultAdminSigner);
    await musdc.mint(address, amount);
    await musdt.mint(address, amount);
    await mwbtc.mint(address, amount);
    await meuroc.mint(address, amount);
    await dfi.mint(address, amount);

    await this.hardhatNetwork.generate(1);
  }

  /**
   * Approves the bridge contract to spend MUSDC and MUSDT and MWBTC tokens.
   *
   * This approves the maximum possible amount.
   * @param signer
   */
  async approveBridgeForEOA(signer: Signer): Promise<void> {
    const { musdc, musdt, mwbtc, meuroc, dfi } = this.getContractsWithSigner(signer);
    const { queueBridgeProxy } = this.contracts;
    const tokenAddresses: TestToken[] = [musdc, musdt, mwbtc, meuroc, dfi];
    for (const token of tokenAddresses) {
      await token.approve(queueBridgeProxy.address, constants.MaxInt256);
    }

    await this.hardhatNetwork.generate(1);
  }

  /**
   * A convenience function that
   * - Deploys the bridge contracts, with MUSDCT and MUSDT as supported tokens
   * - Mints MUSDC and MUSDT tokens to the admin and operational signer of the bridge
   * - Approves the bridge contract to spend MUSDC and MUSDT tokens on behalf of the above signer
   *
   * When using this function, the signer of the HardhatContainer will be the admin and operational signer of the bridge.
   */
  async setup(): Promise<void> {
    await this.deployContracts();
    await this.mintTokensToEOA(await this.defaultAdminSigner.getAddress());
    await this.approveBridgeForEOA(await this.defaultAdminSigner);
  }
}

export interface BridgeContracts {
  queueBridgeProxy: BridgeQueue;
  queueBridgeImplementation: BridgeQueue;
  musdt: TestToken;
  musdc: TestToken;
  mwbtc: TestToken;
  meuroc: TestToken;
  // mmatic: TestToken;
  dfi: TestToken;
}
