import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICache } from '../../../domain/ports/cache.port';

/**
 * Cache-aside / write-behind buffer over Redis. Never the source of truth
 * (that's always SQLite via PrismaGameRepository/PrismaUserRepository) and
 * never allowed to throw — a Redis outage degrades the app, it never
 * breaks it. See ARCHITECTURE.md §9.
 */
@Injectable()
export class RedisCacheService implements ICache, OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;
  private available = false;

  constructor(config: ConfigService) {
    const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => 2000,
    });
    this.client.on('ready', () => {
      this.available = true;
      this.logger.log('Connected to Redis.');
    });
    this.client.on('error', (error: Error) => {
      this.available = false;
      this.logger.warn(`Redis error: ${error.message}`);
    });
    this.client.on('close', () => {
      this.available = false;
      this.logger.warn('Redis connection closed.');
    });
  }

  isAvailable(): boolean {
    return this.available;
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.available) return null;
    try {
      const raw = await this.client.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      this.available = false;
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 300): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      this.available = false;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.available) return;
    try {
      await this.client.del(key);
    } catch {
      this.available = false;
    }
  }

  onModuleDestroy(): void {
    this.client.disconnect();
  }
}
