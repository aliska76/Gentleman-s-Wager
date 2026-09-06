import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_PROVIDER, IAuthProvider } from '../domain/ports/auth-provider.port';

export interface LoginResult {
  token: string;
  userId: string;
  username: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly authProvider: IAuthProvider,
    private readonly jwt: JwtService,
  ) {}

  async login(username: string): Promise<LoginResult> {
    const identity = await this.authProvider.login(username);
    const token = await this.jwt.signAsync({ sub: identity.userId, username: identity.username });
    return { token, userId: identity.userId, username: identity.username };
  }
}
