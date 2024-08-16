import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, RouterModule } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { appConfig, ENV_VALIDATION_SCHEMA } from './AppConfig';
import { BalancesModule } from './balances/BalancesModule';
import { DeFiChainModule } from './defichain/DeFiChainModule';
import { EthereumModule } from './ethereum/EthereumModule';
import { QueueModule } from './ethereum/queue/QueueModule';
import { EthersModule } from './modules/EthersModule';
import { HealthModule } from './modules/HealthModule';
import { SettingsModule } from './settings/SettingsModule';
import { VersionModule } from './version/VersionModule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: ENV_VALIDATION_SCHEMA,
    }),
    ThrottlerModule.forRoot({
      ttl: 60,
      limit: 10,
    }),
    EthersModule,
    DeFiChainModule,
    EthereumModule,
    RouterModule.register([
      {
        path: 'defichain',
        module: DeFiChainModule,
      },
      {
        path: 'ethereum',
        module: EthereumModule,
        children: [
          {
            path: 'queue',
            module: QueueModule,
          },
        ],
      },
    ]),
    HealthModule,
    VersionModule,
    BalancesModule,
    SettingsModule,
  ],
  controllers: [],
  providers: [
    DeFiChainModule,
    EthereumModule,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
