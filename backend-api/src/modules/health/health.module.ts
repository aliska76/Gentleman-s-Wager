import { Module } from '@nestjs/common';
import { CacheModule } from '../../infrastructure/cache/redis/cache.module';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { HealthController } from './health.controller';

@Module({
  imports: [PrismaModule, CacheModule],
  controllers: [HealthController],
})
export class HealthModule {}
