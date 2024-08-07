import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Semaphore, SemaphoreInterface, withTimeout } from 'async-mutex';
import { Cache } from 'cache-manager';

import { CacheOption, CachePrefix, GlobalCache } from './GlobalCache';

@Injectable()
export class SemaphoreCache {
  static MAX_CONCURRENCY = 1;

  static TIMEOUT = 45_000;

  protected readonly cache: GlobalCache;

  protected readonly semaphores: Record<string, SemaphoreInterface> = {};

  constructor(@Inject(CACHE_MANAGER) cacheManager: Cache) {
    this.cache = new GlobalCache(cacheManager);
  }

  /**
   * Resolve from SemaphoreCache cache key via double-checked locking.
   *
   * @param {string} key to use for semaphore cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @param {GlobalCache} options
   */
  async get<T>(key: string, fetch: () => Promise<T | undefined>, options: CacheOption = {}): Promise<T | undefined> {
    return this.cache.get(
      CachePrefix.SEMAPHORE,
      key,
      async () => {
        const semaphore = this.acquireSemaphore(key);
        const response = await semaphore.runExclusive(async () =>
          this.cache.get(CachePrefix.SEMAPHORE, key, async () => fetch(), options),
        );
        return response;
      },
      options,
    );
  }

  /**
   * @param {string} key to lock cache concurrency
   */
  private acquireSemaphore(key: string): SemaphoreInterface {
    const semaphore = this.semaphores[key];
    if (semaphore === undefined) {
      this.semaphores[key] = withTimeout(new Semaphore(SemaphoreCache.MAX_CONCURRENCY), SemaphoreCache.TIMEOUT);
    }

    return this.semaphores[key];
  }
}
