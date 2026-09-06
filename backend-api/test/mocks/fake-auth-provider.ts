import { IAuthProvider, ResolvedIdentity } from '../../src/domain/ports/auth-provider.port';

export class FakeAuthProvider implements IAuthProvider {
  constructor(private readonly identity: ResolvedIdentity) {}

  async login(): Promise<ResolvedIdentity> {
    return this.identity;
  }
}
