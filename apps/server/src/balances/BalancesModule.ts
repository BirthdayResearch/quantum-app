import { Module } from '@nestjs/common';

import { DeFiChainModule } from '../defichain/DeFiChainModule';
import { EthereumModule } from '../ethereum/EthereumModule';
import { BalancesController } from './BalancesController';
import { BalancesService } from './BalancesService';

@Module({
  controllers: [BalancesController],
  providers: [BalancesService],
  imports: [EthereumModule, DeFiChainModule],
})
export class BalancesModule {}
