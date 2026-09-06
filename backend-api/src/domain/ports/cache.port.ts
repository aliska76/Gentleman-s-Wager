/**
 * Cache is always optional. `isAvailable()` lets callers degrade
 * gracefully (see GamesService.roll) instead of discovering a Redis
 * outage the hard way. Implementations must never throw.
 */
export interface ICache {
  isAvailable(): boolean;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export const CACHE = Symbol('CACHE');
