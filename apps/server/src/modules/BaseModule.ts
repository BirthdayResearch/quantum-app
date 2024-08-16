import { DynamicModule, Global, Module, ModuleMetadata } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';

/**
 * Baseline module for any Bridge nest applications.
 *
 * - `@nestjs/config`, nestjs ConfigModule
 * - `nestjs-pino`, the Pino logger for NestJS
 * - `joi`, for validation of environment variables
 */
@Global()
@Module({
  imports: [
    LoggerModule.forRoot({
      exclude: ['/health', '/version', '/settings'],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
  ],
})
export class BaseModule {
  static with(metadata: ModuleMetadata): DynamicModule {
    return {
      module: BaseModule,
      global: true,
      ...metadata,
    };
  }
}
