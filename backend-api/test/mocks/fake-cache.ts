import { ICache } from '../../src/domain/ports/cache.port';

/**
 * In-memory ICache with a manual availability switch, so tests can exercise
 * both the happy path (cache up) and the degradation path (cache down —
 * see GamesService.roll, which forces every roll to be durable when this
 * is false) without touching real Redis.
 */
export class FakeCache implements ICache {
  private readonly store = new Map<string, unknown>();
  private available = true;

  setAvailable(value: boolean): void {
    this.available = value;
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.available) return null;
    return (this.store.has(key) ? (this.store.get(key) as T) : null);
  }

  async set<T>(key: string, value: T): Promise<void> {
    if (!this.available) return;
    this.store.set(key, value);
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    this.store.delete(key);
  }
}
