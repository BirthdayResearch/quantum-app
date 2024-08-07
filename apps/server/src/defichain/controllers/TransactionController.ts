import { Controller, Get, Query, ValidationPipe } from '@nestjs/common';
import { DeFiChainAddressIndex } from '@prisma/client';

import { SemaphoreCache } from '../../libs/caches/SemaphoreCache';
import { TransactionsQueryDto } from '../DefichainInterface';
import { DeFiChainTransactionService } from '../services/DeFiChainTransactionService';

@Controller()
export class TransactionsController {
  constructor(
    private readonly defiChainTransactionService: DeFiChainTransactionService,
    protected readonly cache: SemaphoreCache,
  ) {}

  @Get('transactions')
  async getTransactions(
    @Query(new ValidationPipe()) { fromDate, toDate }: TransactionsQueryDto,
  ): Promise<Omit<DeFiChainAddressIndex, 'id'>[] | undefined> {
    const dateFrom = new Date(fromDate);
    const dateTo = new Date(toDate);
    const today = new Date();

    const isTodayOrInFuture = dateTo >= today;
    const cacheTtl = isTodayOrInFuture ? 5 * 60_000 : 3600_000 * 24; // 5 minutes if toDate is today or in the future, 1 day otherwise

    const cacheKey = `DFC_TX_${fromDate}_${toDate}`;
    return this.cache.get(
      cacheKey,
      async () => this.defiChainTransactionService.getTransactions(dateFrom, dateTo, today),
      {
        ttl: cacheTtl,
      },
    );
  }
}
