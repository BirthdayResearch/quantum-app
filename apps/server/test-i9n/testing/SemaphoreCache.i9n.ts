import { CacheModule } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';

import { SemaphoreCache } from '../../src/libs/caches/SemaphoreCache';

let testing: TestingModule;
let cache: SemaphoreCache;

beforeAll(async () => {
  testing = await Test.createTestingModule({
    imports: [CacheModule.register()],
    providers: [SemaphoreCache],
  }).compile();

  cache = testing.get(SemaphoreCache);
});

it('should run once with they same key, due to concurrency of 1', async () => {
  let counter = 0;

  async function fetch(): Promise<string> {
    return new Promise((resolve) => {
      counter += 1;
      setTimeout(() => resolve('1'), 1000);
    });
  }

  await Promise.all([
    cache.get('collide-1', fetch),
    cache.get('collide-1', fetch),
    cache.get('collide-1', fetch),
    cache.get('collide-1', fetch),
  ]);

  expect(counter).toStrictEqual(1);
});

it('key should not collide', async () => {
  let counter = 0;

  async function fetch(): Promise<string> {
    return new Promise((resolve) => {
      counter += 1;
      setTimeout(() => resolve('1'), 1000);
    });
  }

  await Promise.all([
    cache.get('not-collide-1', fetch),
    cache.get('not-collide-2', fetch),
    cache.get('not-collide-3', fetch),
    cache.get('not-collide-4', fetch),
    cache.get('not-collide-5', fetch),
  ]);

  expect(counter).toStrictEqual(5);
});
