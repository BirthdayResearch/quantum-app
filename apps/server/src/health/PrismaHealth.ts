import { Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

import { PrismaService } from '../PrismaService';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  constructor(private readonly prismaService: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    return this.prismaService.$queryRaw`SELECT 1`
      .then(() => this.getStatus(key, true))
      .catch((e) => {
        throw new HealthCheckError(e.message, this.getStatus(key, false, e));
      });
  }
}
