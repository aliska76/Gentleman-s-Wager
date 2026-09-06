import { apiRequest } from './client';
import type { BotTurnResult, GameState, RollOutcome } from '../types/game';

export function createGame(token: string, opponentUserId: string, winningScore?: number): Promise<GameState> {
  return apiRequest<GameState>('/games', { method: 'POST', jwt: token, body: { opponentUserId, winningScore } });
}

export function getGame(token: string, gameId: string): Promise<GameState> {
  return apiRequest<GameState>(`/games/${gameId}`, { jwt: token });
}

export function roll(token: string, gameId: string): Promise<RollOutcome> {
  return apiRequest<RollOutcome>(`/games/${gameId}/roll`, { method: 'POST', jwt: token });
}

export function hold(token: string, gameId: string): Promise<GameState> {
  return apiRequest<GameState>(`/games/${gameId}/hold`, { method: 'POST', jwt: token });
}

/** One roll-or-hold step of the bot's turn — call repeatedly while it's the bot's turn. */
export function botTurn(token: string, gameId: string): Promise<BotTurnResult> {
  return apiRequest<BotTurnResult>(`/games/${gameId}/bot-turn`, { method: 'POST', jwt: token });
}

export function newGame(token: string, gameId: string, winningScore?: number): Promise<GameState> {
  return apiRequest<GameState>(`/games/${gameId}/new`, {
    method: 'POST',
    jwt: token,
    body: winningScore !== undefined ? { winningScore } : undefined,
  });
}
