import { stats } from '@defichain/whale-api-client';
import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { SemaphoreCache } from '../../libs/caches/SemaphoreCache';
import { DeFiChainStats, DFCStatsDto } from '../DefichainInterface';
import { DeFiChainStatsService } from '../services/DeFiChainStatsService';
import { WhaleApiService } from '../services/WhaleApiService';

@Controller()
export class StatsController {
  constructor(
    private readonly whaleClient: WhaleApiService,
    protected readonly cache: SemaphoreCache,
    private defichainStatsService: DeFiChainStatsService,
  ) {}

  @SkipThrottle()
  @Get('/whale/stats')
  async get(): Promise<stats.StatsData> {
    return this.whaleClient.getClient().stats.get();
  }

  @Get('/stats')
  async getDFCStats(@Query('date') date?: DFCStatsDto): Promise<DeFiChainStats> {
    const cacheKey = `DFC_STATS_${date ?? 'TODAY'}`;
    return (await this.cache.get(cacheKey, async () => this.defichainStatsService.getDefiChainStats(date), {
      ttl: 3600_000 * 24, // 1 day
    })) as DeFiChainStats;
  }
}
