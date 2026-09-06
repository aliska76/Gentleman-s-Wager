import { Module } from '@nestjs/common';
import { GamesService } from '../../application/games.service';
import { CacheModule } from '../../infrastructure/cache/redis/cache.module';
import { DiceModule } from '../../infrastructure/dice/dice.module';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { GamesController } from './games.controller';

@Module({
  imports: [PrismaModule, CacheModule, DiceModule, AuthModule],
  controllers: [GamesController],
  providers: [GamesService],
})
export class GamesModule {}
