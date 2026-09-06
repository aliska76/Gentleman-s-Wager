import { GameState } from '../entities';

/**
 * The batched-flush half of ARCHITECTURE.md §8.3. A turn-boundary write
 * (hold or bust) that is already durable in the cache doesn't need to hit
 * SQLite immediately — it can sit here and be written together with
 * whatever else changed in the last few seconds, in one transaction.
 *
 * A win never goes through this port at all: GamesService always writes
 * it with IGameRepository.save() directly, synchronously (§8.2) — the one
 * event that must never wait for a timer.
 */
export interface IGameWriteBuffer {
  /** Queues this state for the next flush, replacing any state already queued for the same game id. */
  enqueue(state: GameState): void;

  /**
   * Durably writes every currently queued state in one batch and clears
   * the queue. Never throws — a failed flush re-queues its states instead,
   * so nothing is silently dropped; the next scheduled flush (or the final
   * one on shutdown) gets another chance.
   */
  flush(): Promise<void>;

  /**
   * Drops any queued state for this game id without writing it. Called by
   * GamesService right after every synchronous, immediate write (a win,
   * or the no-cache fallback) — otherwise an older state queued earlier
   * for the same game (e.g. the ordinary hold that opened the bot's turn)
   * would still be sitting here and could flush *after* the fresher write,
   * silently overwriting it with stale data.
   */
  discard(gameId: string): void;
}

export const GAME_WRITE_BUFFER = Symbol('GAME_WRITE_BUFFER');
