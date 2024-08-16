import { Controller, Get, Query } from '@nestjs/common';

import { SemaphoreCache } from '../../libs/caches/SemaphoreCache';
import { StatsDto, StatsQueryDto } from '../EthereumInterface';
import { EthereumStatsService } from '../services/EthereumStatsService';

@Controller()
export class StatsController {
  constructor(
    private readonly ethereumStatsService: EthereumStatsService,
    protected readonly cache: SemaphoreCache,
  ) {}

  @Get('stats/')
  async getStats(@Query('date') date?: StatsQueryDto): Promise<StatsDto> {
    const cacheKey = `ETH_STATS_${date ?? 'TODAY'}`;
    return (await this.cache.get(cacheKey, async () => this.ethereumStatsService.getStats(date), {
      ttl: 3600_000 * 24, // 1 day
    })) as StatsDto;
  }
}
