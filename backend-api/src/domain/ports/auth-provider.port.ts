export interface ResolvedIdentity {
  userId: string;
  username: string;
}

/**
 * How a username turns into a real identity. Today: MockAuthProvider,
 * no password. Tomorrow: swap in a password/OAuth2/SSO implementation
 * without touching AuthService, guards, or controllers.
 */
export interface IAuthProvider {
  login(username: string): Promise<ResolvedIdentity>;
}

export const AUTH_PROVIDER = Symbol('AUTH_PROVIDER');
