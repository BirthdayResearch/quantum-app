import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { WhaleApiClientProvider } from '../defichain/providers/WhaleApiClientProvider';
import { WhaleWalletProvider } from '../defichain/providers/WhaleWalletProvider';
import { DeFiChainTransactionService } from '../defichain/services/DeFiChainTransactionService';
import { SendService } from '../defichain/services/SendService';
import { WhaleApiService } from '../defichain/services/WhaleApiService';
import { SemaphoreCache } from '../libs/caches/SemaphoreCache';
import { EthersModule } from '../modules/EthersModule';
import { PrismaService } from '../PrismaService';
import { EthereumController } from './controllers/EthereumController';
import { StatsController } from './controllers/StatsController';
import { TransactionsController } from './controllers/TransactionsController';
import { QueueModule } from './queue/QueueModule';
import { EthereumStatsService } from './services/EthereumStatsService';
import { EthereumTransactionsService } from './services/EthereumTransactionsService';
import { EVMTransactionConfirmerService } from './services/EVMTransactionConfirmerService';
import { VerificationService } from './services/VerificationService';

@Module({
  providers: [
    SendService,
    PrismaService,
    WhaleApiService,
    WhaleWalletProvider,
    WhaleApiClientProvider,
    DeFiChainTransactionService,
    EVMTransactionConfirmerService,
    EthereumStatsService,
    EthereumTransactionsService,
    VerificationService,
    SemaphoreCache,
    QueueModule,
  ],
  controllers: [EthereumController, StatsController, TransactionsController],
  imports: [EthersModule, CacheModule.register({ max: 10_000 }), QueueModule],
  exports: [EVMTransactionConfirmerService, EthereumStatsService],
})
export class EthereumModule {}
