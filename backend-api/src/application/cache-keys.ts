/**
 * Cache key construction, kept in one place so a key is never retyped (and
 * risk drifting) across the services that touch it. Before this, the
 * `'leaderboard'` key existed as a named constant in UsersService but as a
 * bare string literal in GamesService's win-invalidation call — harmless
 * today only because both happen to spell it the same way.
 */
export const LEADERBOARD_CACHE_KEY = 'leaderboard';

export function gameCacheKey(gameId: string): string {
  return `game:${gameId}`;
}
