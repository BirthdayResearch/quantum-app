import { Cache } from 'cache-manager';

export interface CacheOption {
  ttl?: number;
}

export enum CachePrefix {
  SEMAPHORE = -1,
}

export class GlobalCache {
  constructor(protected readonly cacheManager: Cache) {}

  /**
   * Batch get from cache, providing a fetch interface if cache miss.
   *
   * @param {number} prefix to prevent key collision
   * @param {string[]} ids to batch get from cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @param {GlobalCache} options
   * @param {number} [options.ttl=600] cache ttl, 600 milliseconds
   * @return Promise<Record<string, T | undefined>>
   */
  async batch<T>(
    prefix: CachePrefix,
    ids: string[],
    fetch: (id: string) => Promise<T | undefined>,
    options: CacheOption = {},
  ): Promise<Record<string, T | undefined>> {
    const records: Record<string, T | undefined> = {};
    for (const id of ids) {
      records[id] = await this.get(prefix, id, fetch, options);
    }
    return records;
  }

  /**
   * Get from cache, providing a fetch interface if cache miss.
   *
   * @param {number} prefix to prevent key collision
   * @param {string} id to get from cache
   * @param {(id: string) => Promise<T | undefined>} fetch if miss cache
   * @param {GlobalCache} options
   * @param {number} [options.ttl=600] cache ttl, 600 milliseconds
   * @return {Promise<T | undefined>}
   */
  async get<T>(
    prefix: number,
    id: string,
    fetch: (id: string) => Promise<T | undefined>,
    options: CacheOption = {},
  ): Promise<T | undefined> {
    const key: string = `${prefix} ${id}`;
    const cached = await this.cacheManager.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const fetched = await fetch(id);

    if (fetched === undefined) {
      return undefined;
    }

    await this.cacheManager.set(key, fetched, options.ttl ?? 600_000);

    return fetched;
  }
}
