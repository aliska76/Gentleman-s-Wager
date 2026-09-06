import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from '../../application/auth.service';
import { JwtAuthGuard } from '../../common/jwt-auth.guard';
import { AUTH_PROVIDER } from '../../domain/ports/auth-provider.port';
import { MockAuthProvider } from '../../infrastructure/auth/mock/mock-auth.provider';
import { PrismaModule } from '../../infrastructure/persistence/prisma/prisma.module';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
        signOptions: { expiresIn: '12h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: AUTH_PROVIDER, useClass: MockAuthProvider }, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
