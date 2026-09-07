import { apiRequest } from './client';
import type { PaginatedResult, UserProfile } from '../types/user';

/** Use the returned id as opponentUserId in createGame() to play against the computer. */
export function getBotOpponent(token: string): Promise<UserProfile> {
  return apiRequest<UserProfile>('/users/bot', { jwt: token });
}

export function getLeaderboard(token: string, limit = 10, offset = 0): Promise<PaginatedResult<UserProfile>> {
  return apiRequest<PaginatedResult<UserProfile>>(`/leaderboard?limit=${limit}&offset=${offset}`, { jwt: token });
}
