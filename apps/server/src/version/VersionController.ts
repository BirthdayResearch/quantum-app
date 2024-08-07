import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SkipThrottle } from '@nestjs/throttler';

import { SemaphoreCache } from '../libs/caches/SemaphoreCache';
import { VersionModel } from './VersionInterface';

@Controller('version')
export class VersionController {
  constructor(
    private configService: ConfigService,
    protected readonly cache: SemaphoreCache,
  ) {}

  @SkipThrottle()
  @Get()
  public async getVersion(): Promise<VersionModel> {
    const key = `APP_VERSION`;
    return (await this.cache.get(
      key,
      async () => {
        const version = this.configService.get<string>('APP_VERSION');
        return {
          v: version ?? '0.0.0',
        };
      },
      {
        ttl: 3600_000 * 24 * 7, // 1 week
      },
    )) as VersionModel;
  }
}
