import { WhaleApiClient } from '@defichain/whale-api-client';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentNetwork } from '@waveshq/walletkit-core';

import { WhaleApiClientProvider } from '../providers/WhaleApiClientProvider';

@Injectable()
export class WhaleApiService {
  private network: EnvironmentNetwork;

  constructor(
    private readonly clientProvider: WhaleApiClientProvider,
    private configService: ConfigService,
  ) {
    this.network = configService.getOrThrow<EnvironmentNetwork>(`defichain.network`);
  }

  getClient(): WhaleApiClient {
    return this.clientProvider.getClient(this.network);
  }
}
