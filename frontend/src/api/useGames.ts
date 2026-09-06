import { useMutation, useQuery } from '@tanstack/react-query';
import { botTurn, createGame, getGame, hold, newGame, roll } from './games';

/** The response-handling wrappers for the games entry point — one per action. */

/** Bootstraps a game from just its id — used to restore a session's active game after a page reload. */
export function useGame(token: string | null, gameId: string | null) {
  return useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGame(token as string, gameId as string),
    enabled: Boolean(token && gameId),
  });
}

export function useCreateGame() {
  return useMutation({
    mutationFn: (args: { token: string; opponentUserId: string; winningScore?: number }) =>
      createGame(args.token, args.opponentUserId, args.winningScore),
  });
}

export function useRoll() {
  return useMutation({
    mutationFn: (args: { token: string; gameId: string }) => roll(args.token, args.gameId),
  });
}

export function useHold() {
  return useMutation({
    mutationFn: (args: { token: string; gameId: string }) => hold(args.token, args.gameId),
  });
}

export function useBotTurn() {
  return useMutation({
    mutationFn: (args: { token: string; gameId: string }) => botTurn(args.token, args.gameId),
  });
}

export function useNewGame() {
  return useMutation({
    mutationFn: (args: { token: string; gameId: string; winningScore?: number }) =>
      newGame(args.token, args.gameId, args.winningScore),
  });
}
