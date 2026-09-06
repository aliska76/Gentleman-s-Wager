import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService, LoginResult } from '../../application/auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: 'Log in (mock auth) and receive a JWT',
    description:
      'No password: supplying a username is enough. A user row is created on first login. ' +
      'Deliberately tighter rate limit than the app default — this is the one endpoint an ' +
      'unauthenticated caller can hit at all.',
  })
  // Global default is 30 req/60s (AppModule). Login gets its own, stricter
  // limit since it's the only endpoint reachable without a token — worth
  // guarding against naive brute-forcing even though there's no password.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto): Promise<LoginResult> {
    return this.authService.login(dto.username);
  }
}
