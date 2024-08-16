import { PlaygroundApiClient, PlaygroundRpcClient } from '@defichain/playground-api-client';
import {
  NativeChainContainer,
  PlaygroundApiContainer,
  StartedNativeChainContainer,
  StartedPlaygroundApiContainer,
  StartedWhaleApiContainer,
  WhaleApiContainer,
} from '@defichain/testcontainers';
import { WhaleApiClient } from '@defichain/whale-api-client';
import { Network } from 'testcontainers';

/**
 * DeFiChain Container that runs all necessary containers (Playground, Whale, Ain).
 *
 * */
export class DeFiChainStubContainer {
  async start(): Promise<StartedDeFiChainStubContainer> {
    const network = await new Network().start();
    const defid = await new NativeChainContainer().withNetwork(network).withPreconfiguredRegtestMasternode().start();
    const whale = await new WhaleApiContainer().withNetwork(network).withNativeChain(defid, network).start();
    const playground = await new PlaygroundApiContainer().withNetwork(network).withNativeChain(defid, network).start();
    await playground.waitForReady();
    return new StartedDeFiChainStubContainer(defid, whale, playground);
  }
}

export class StartedDeFiChainStubContainer {
  public playgroundRpcClient: PlaygroundRpcClient;

  public playgroundClient: PlaygroundApiClient;

  public whaleClient: WhaleApiClient;

  public static LOCAL_MNEMONIC = process.env.DEFICHAIN_PRIVATE_KEY;

  constructor(
    protected defid: StartedNativeChainContainer,
    protected whale: StartedWhaleApiContainer,
    protected playground: StartedPlaygroundApiContainer,
  ) {
    this.playgroundClient = new PlaygroundApiClient({ url: this.playground.getPlaygroundApiClientOptions().url });
    this.playgroundRpcClient = new PlaygroundRpcClient(this.playgroundClient);
    this.whaleClient = new WhaleApiClient(this.whale.getWhaleApiClientOptions());
  }

  async stop(): Promise<void> {
    await this.whale.stop();
    await this.defid.stop();
    await this.playground.stop();
  }

  /**
   * Please note that number of blocks generated can be 2-3 blocks off from the given `number`.
   * eg. if you want to generate 35 blocks you might need to add a little allowance and generate 38 blocks instead
   * @param number
   */
  async generateBlock(number = 10): Promise<void> {
    await this.playgroundClient.rpc.call('generatetoaddress', [number, 'mswsMVsyGMj1FzDMbbxw2QW3KvQAv2FKiy'], 'number');
  }

  async getWhaleURL(): Promise<string> {
    return this.whale.getWhaleApiClientOptions().url;
  }
}
