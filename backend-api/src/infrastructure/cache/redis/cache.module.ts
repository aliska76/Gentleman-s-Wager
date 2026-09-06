import { Module } from '@nestjs/common';
import { CACHE } from '../../../domain/ports/cache.port';
import { RedisCacheService } from './redis-cache.service';

@Module({
  providers: [{ provide: CACHE, useClass: RedisCacheService }],
  exports: [CACHE],
})
export class CacheModule {}
