import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { SemaphoreCache } from '../libs/caches/SemaphoreCache';
import { VersionController } from './VersionController';

@Module({
  imports: [CacheModule.register({ max: 10_000 })],
  providers: [SemaphoreCache],
  controllers: [VersionController],
})
export class VersionModule {}
