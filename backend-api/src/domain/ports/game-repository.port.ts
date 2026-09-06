import { GameState } from '../entities';

/**
 * The one door the application layer has into game persistence. Swapping
 * SQLite for Aurora Postgres — or Prisma for something else entirely —
 * means writing a new class against this interface, never touching
 * GamesService or the domain engine.
 */
export interface IGameRepository {
  findById(id: string): Promise<GameState | null>;
  create(state: GameState): Promise<GameState>;
  /** Full-state, immediate write — for a win (always synchronous, §8.2) or whenever there's no cache safety net to fall back on. */
  save(state: GameState): Promise<GameState>;
  /** Durably writes many states in one transaction — the batched-flush counterpart to save(), driven by IGameWriteBuffer (see ARCHITECTURE.md §8.3). */
  saveMany(states: GameState[]): Promise<void>;
}

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');
