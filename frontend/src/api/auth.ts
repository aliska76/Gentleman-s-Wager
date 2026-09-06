import { apiRequest } from './client';
import type { LoginResponse } from '../types/auth';

/**
 * Mock auth (see backend-api README): any username logs in, creating the
 * user on first login. No separate "sign up" call exists or is needed.
 */
export function login(username: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/auth/login', { method: 'POST', body: { username } });
}
