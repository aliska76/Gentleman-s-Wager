import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GamesModule } from './modules/games/games.module';
import { HealthModule } from './modules/health/health.module';

// Application (jest) unit tests instantiate services directly and never
// go through Nest's HTTP pipeline at all, but e2e tests do boot the real
// AppModule — without this, its throttler would start counting real
// requests against a limit meant for production traffic and make the
// e2e suite flaky under repeated runs.
const isTestEnv = process.env.NODE_ENV === 'test';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{
      ttl: 60_000,
      limit: isTestEnv ? 1000 : 30,
    }]),
    AuthModule,
    UsersModule,
    GamesModule,
    HealthModule,
  ],
  providers: [...(isTestEnv ? [] : [{ provide: APP_GUARD, useClass: ThrottlerGuard }])],
})
export class AppModule {}
