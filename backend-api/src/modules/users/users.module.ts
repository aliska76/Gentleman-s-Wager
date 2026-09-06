import { Module } from '@nestjs/common';
import { UsersService } from '../../application/users.service';
import { CacheModule } from '../../infrastructure/cache/redis/cache.module';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './users.controller';

@Module({
  imports: [PrismaModule, CacheModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
