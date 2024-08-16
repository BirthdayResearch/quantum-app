import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { Chain as LightMyRequestChain, InjectOptions, Response as LightMyRequestResponse } from 'light-my-request';

import { BridgeServerApp } from '../../src/BridgeServerApp';
import { BaseModule } from '../../src/modules/BaseModule';

/**
 * Testing app used for testing Bridge Server App behaviour through integration tests
 */
export class BridgeServerTestingApp extends BridgeServerApp<NestFastifyApplication> {
  async createTestingModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        BaseModule.with({
          imports: [this.module],
        }),
      ],
    }).compile();
  }

  override async createNestApp(): Promise<NestFastifyApplication> {
    const module = await this.createTestingModule();
    return module.createNestApplication<NestFastifyApplication>(this.fastifyAdapter, this.nestApplicationOptions);
  }

  async start(): Promise<NestFastifyApplication> {
    return this.init();
  }

  /**
   * A wrapper function around native `fastify.inject()` method.
   * @returns {void}
   */
  inject(): LightMyRequestChain;
  inject(opts: InjectOptions | string): Promise<LightMyRequestResponse>;
  inject(opts?: InjectOptions | string): LightMyRequestChain | Promise<LightMyRequestResponse> {
    if (opts === undefined) {
      return this.app!.inject();
    }
    return this.app!.inject(opts);
  }
}
