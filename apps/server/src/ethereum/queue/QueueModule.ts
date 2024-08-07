import { Module } from '@nestjs/common';

import { WhaleApiClientProvider } from '../../defichain/providers/WhaleApiClientProvider';
import { WhaleWalletProvider } from '../../defichain/providers/WhaleWalletProvider';
import { DeFiChainTransactionService } from '../../defichain/services/DeFiChainTransactionService';
import { WhaleApiService } from '../../defichain/services/WhaleApiService';
import { EthersModule } from '../../modules/EthersModule';
import { PrismaService } from '../../PrismaService';
import { VerificationService } from '../services/VerificationService';
import { QueueController } from './controllers/QueueController';
import { RefundController } from './controllers/RefundController';
import { QueueService } from './services/QueueService';
import { RefundService } from './services/RefundService';

@Module({
  providers: [
    PrismaService,
    QueueService,
    RefundService,
    VerificationService,
    DeFiChainTransactionService,
    WhaleWalletProvider,
    WhaleApiClientProvider,
    WhaleApiService,
  ],
  controllers: [QueueController, RefundController],
  imports: [EthersModule],
})
export class QueueModule {}
