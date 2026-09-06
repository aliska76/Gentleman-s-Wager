import { JwtService } from '@nestjs/jwt';
import { AuthService } from '../../src/application/auth.service';
import { FakeAuthProvider } from '../mocks/fake-auth-provider';

describe('AuthService', () => {
  it('resolves the identity through the auth provider and signs a matching JWT', async () => {
    const provider = new FakeAuthProvider({ userId: 'u1', username: 'edmund' });
    const jwt = new JwtService({ secret: 'test-secret' });
    const service = new AuthService(provider, jwt);

    const result = await service.login('edmund');

    expect(result.userId).toBe('u1');
    expect(result.username).toBe('edmund');
    expect(typeof result.token).toBe('string');

    const payload = jwt.verify<{ sub: string; username: string }>(result.token);
    expect(payload.sub).toBe('u1');
    expect(payload.username).toBe('edmund');
  });
});
