import { GenericContainer, GenericStartedContainer, Wait } from '@birthdayresearch/sticky-testcontainers';
import fetch, { Headers } from 'cross-fetch';

import { HardhatNetwork } from './HardhatNetwork';
import { toZeroStrippedHex } from './Utils';

export class HardhatNetworkContainer extends GenericContainer {
  // Hardcoded image name that is created after running docker build in the smartcontracts package
  static readonly IMAGE_NAME = 'bridge-packages/hardhatnetwork-queue:0.0.0';

  // Default RPC port exposed by Hardhat
  static readonly RPC_PORT = 8545;

  constructor() {
    super(HardhatNetworkContainer.IMAGE_NAME);

    // The default behaviour is to NOT auto-mine transactions
    // Any necessary auto-mines will need to be explicit by override
    this.withEnvironment({
      TRANSACTION_AUTOMINE: 'false',
    })
      .withExposedPorts(HardhatNetworkContainer.RPC_PORT)
      .withWaitStrategy(Wait.forLogMessage('Started HTTP and WebSocket JSON-RPC server at http://0.0.0.0:8545/'))
      .withStartupTimeout(180_000) // 3m
      .withReuse();
  }

  public async start(): Promise<StartedHardhatNetworkContainer> {
    return new StartedHardhatNetworkContainer(await super.start());
  }
}

export class StartedHardhatNetworkContainer extends GenericStartedContainer {
  readonly RPC_VERSION = '2.0';

  get rpcUrl(): string {
    return `http://${this.getHostAddress()}/`;
  }

  async ready(): Promise<HardhatNetwork> {
    // use the first pre-funded account address as the contract deployer address
    const [preFundedAccountAddress] = await this.call('eth_accounts', []);

    // Generate 1000 blocks to reduce gas fee for deployments
    await this.call('hardhat_mine', [toZeroStrippedHex(1_000)]);

    return new HardhatNetwork(this, preFundedAccountAddress);
  }

  getContainerPort(): number {
    return HardhatNetworkContainer.RPC_PORT;
  }

  /**
   * For convenience's sake, utility rpc for the current container.
   * JSON 'result' is parsed and returned
   * @throws TestBlockchainRpcError is raised for any errors arising from the RPC
   */
  async call(method: string, params: any[]): Promise<any> {
    const body = JSON.stringify({
      jsonrpc: this.RPC_VERSION,
      id: Math.floor(Math.random() * 100_000_000_000_000),
      method,
      params,
    });

    const text = await this.post(body);
    const { result, error } = JSON.parse(text);

    if (error !== undefined && error !== null) {
      // TODO: check what to throw here
      throw new Error(error);
    }

    return result;
  }

  /**
   * For convenience’s sake, HTTP POST to the RPC URL for the current container.
   * Not error checked, returns the raw JSON as string.
   */
  private async post(body: string): Promise<string> {
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      body,
      headers: new Headers({
        'Content-Type': 'application/json',
      }),
    });
    return response.text();
  }
}
