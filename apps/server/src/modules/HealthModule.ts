import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { PrismaHealthIndicator } from '../health/PrismaHealth';
import { HealthController } from '../HealthController';
import { PrismaService } from '../PrismaService';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [PrismaService, PrismaHealthIndicator],
})
export class HealthModule {}
