/** Mirrors backend-api's AuthService.LoginResult (src/application/auth.service.ts). */
export interface LoginResponse {
  token: string;
  userId: string;
  username: string;
}
