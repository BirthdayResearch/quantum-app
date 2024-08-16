import { JellyfishWallet, WalletHdNode, WalletHdNodeProvider } from '@defichain/jellyfish-wallet';
import {
  MnemonicHdNodeProvider,
  MnemonicProviderData,
  validateMnemonicSentence,
} from '@defichain/jellyfish-wallet-mnemonic';
import { WhaleWalletAccount, WhaleWalletAccountProvider } from '@defichain/whale-api-wallet';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentNetwork, getBip32Option, getJellyfishNetwork } from '@waveshq/walletkit-core';
import { WalletPersistenceDataI, WalletType } from '@waveshq/walletkit-ui';

import { WhaleApiService } from '../services/WhaleApiService';

@Injectable()
export class WhaleWalletProvider {
  private network: EnvironmentNetwork;

  constructor(
    private readonly whaleClient: WhaleApiService,
    private readonly configService: ConfigService,
  ) {
    this.network = configService.getOrThrow<EnvironmentNetwork>(`defichain.network`);
  }

  createWallet(index: number = 2): WhaleWalletAccount {
    const mnemonic = this.configService.getOrThrow<string>(`defichain.key`);
    if (!validateMnemonicSentence(mnemonic)) {
      throw new Error('Invalid DeFiChain private keys!');
    }
    const data = this.toData(mnemonic.split(' '), this.network);
    const provider = this.initProvider(data, this.network);
    return this.initJellyfishWallet(provider, this.network).get(index);
  }

  getHotWallet(): WhaleWalletAccount {
    return this.createWallet(0);
  }

  async getHotWalletBalance(): Promise<string> {
    const hotWallet = this.getHotWallet();
    const hotWalletAddress = await hotWallet.getAddress();
    return hotWallet.client.address.getBalance(hotWalletAddress);
  }

  private initProvider(
    data: WalletPersistenceDataI<MnemonicProviderData>,
    network: EnvironmentNetwork,
  ): MnemonicHdNodeProvider {
    if (data.type !== WalletType.MNEMONIC_UNPROTECTED || data.version !== 'v1') {
      throw new Error('Unexpected WalletPersistenceDataI');
    }

    const options = getBip32Option(network);
    return MnemonicHdNodeProvider.fromData(data.raw, options);
  }

  private toData(mnemonic: string[], network: EnvironmentNetwork): WalletPersistenceDataI<MnemonicProviderData> {
    const options = getBip32Option(network);
    const data = MnemonicHdNodeProvider.wordsToData(mnemonic, options);

    return {
      version: 'v1',
      type: WalletType.MNEMONIC_UNPROTECTED,
      raw: data,
    };
  }

  private initJellyfishWallet<HdNode extends WalletHdNode>(
    provider: WalletHdNodeProvider<HdNode>,
    network: EnvironmentNetwork,
  ): JellyfishWallet<WhaleWalletAccount, HdNode> {
    const accountProvider = new WhaleWalletAccountProvider(this.whaleClient.getClient(), getJellyfishNetwork(network));
    return new JellyfishWallet(provider, accountProvider);
  }
}
