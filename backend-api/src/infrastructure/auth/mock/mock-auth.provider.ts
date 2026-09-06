import { Inject, Injectable } from '@nestjs/common';
import { IAuthProvider, ResolvedIdentity } from '../../../domain/ports/auth-provider.port';
import { IUserRepository, USER_REPOSITORY } from '../../../domain/ports/user-repository.port';

/**
 * Simplified identity: username only, no password. Still issues a real,
 * verified JWT via AuthService — every game/action endpoint stays gated
 * behind a genuine token check. Swapping this for password or OAuth2/SSO
 * later means a new class implementing IAuthProvider, nothing else changes.
 */
@Injectable()
export class MockAuthProvider implements IAuthProvider {
  constructor(@Inject(USER_REPOSITORY) private readonly users: IUserRepository) {}

  async login(username: string): Promise<ResolvedIdentity> {
    const existing = await this.users.findByUsername(username);
    const user = existing ?? (await this.users.create(username));
    return { userId: user.id, username: user.username };
  }
}
