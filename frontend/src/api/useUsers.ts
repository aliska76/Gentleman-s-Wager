import { useQuery } from '@tanstack/react-query';
import { getBotOpponent, getLeaderboard } from './users';

/** The response-handling wrapper for the leaderboard entry point. */
export function useLeaderboard(token: string | null, limit: number, offset: number) {
  return useQuery({
    queryKey: ['leaderboard', limit, offset],
    queryFn: () => getLeaderboard(token as string, limit, offset),
    enabled: Boolean(token),
    placeholderData: (previous) => previous, // keep the current page visible while the next loads
  });
}

/** The response-handling wrapper for the bot-opponent-lookup entry point. */
export function useBotOpponent(token: string | null) {
  return useQuery({
    queryKey: ['bot-opponent'],
    queryFn: () => getBotOpponent(token as string),
    enabled: Boolean(token),
    staleTime: Infinity, // the seeded bot user's id never changes during a session
  });
}
