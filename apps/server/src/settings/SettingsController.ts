import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import {
  Erc20Token,
  Network,
  NETWORK_TOKENS_LIST,
  NetworkI,
  NetworkOptionsI,
  SupportedDFCTokenSymbols,
  SupportedEVMTokenSymbols,
  TokensI,
} from '../AppConfig';
import { SettingsModel } from './SettingsInterface';

@Controller('settings')
export class SettingsController {
  constructor(private readonly configService: ConfigService) {}

  @SkipThrottle()
  @Get()
  public getSettings(): SettingsModel {
    const supportedTokens = this.getSupportedTokens();

    const settings: SettingsModel = {
      defichain: {
        transferFee: this.configService.getOrThrow('defichain.transferFee') as `${number}`,
        supportedTokens: supportedTokens.defichain,
        network: this.configService.getOrThrow('defichain.network'),
      },
      ethereum: {
        transferFee: this.configService.getOrThrow('ethereum.transferFee') as `${number}`,
        supportedTokens: supportedTokens.ethereum,
      },
    };
    return settings;
  }

  @SkipThrottle()
  @Get('supportedTokens')
  async getSupportedNetworksTokens(): Promise<[NetworkI<Erc20Token>, NetworkI<string>]> {
    const supportedTokens = this.getSupportedTokens();
    return this.filterSupportedNetworkTokens(supportedTokens);
  }

  private getSupportedTokens(): {
    defichain: Array<keyof typeof SupportedDFCTokenSymbols>;
    ethereum: Array<keyof typeof SupportedEVMTokenSymbols>;
  } {
    const supportedDfcTokens = this.configService.getOrThrow('defichain.supportedTokens').split(',') as Array<
      keyof typeof SupportedDFCTokenSymbols
    >;
    const supportedEvmTokens = this.configService.getOrThrow('ethereum.supportedTokens').split(',') as Array<
      keyof typeof SupportedEVMTokenSymbols
    >;

    return { defichain: supportedDfcTokens, ethereum: supportedEvmTokens };
  }

  private filterSupportedNetworkTokens(supportedTokens: {
    defichain: Array<keyof typeof SupportedDFCTokenSymbols>;
    ethereum: Array<keyof typeof SupportedEVMTokenSymbols>;
  }): [NetworkI<Erc20Token>, NetworkI<string>] {
    const supportedTokensPerNetwork = {
      [Network.DeFiChain]: supportedTokens.defichain,
      [Network.Ethereum]: supportedTokens.ethereum,
    };

    return NETWORK_TOKENS_LIST.map((network: NetworkOptionsI) => {
      const supportedNetworkTokens = supportedTokensPerNetwork[network.name];
      const filteredTokens = network.tokens.filter((token: TokensI) =>
        supportedNetworkTokens.some((supportedToken) => supportedToken === token.tokenA.symbol),
      );

      return {
        ...network,
        tokens: filteredTokens,
      };
    }) as [NetworkI<Erc20Token>, NetworkI<string>];
  }
}
