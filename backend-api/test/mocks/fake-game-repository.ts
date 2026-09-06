import { GameState } from '../../src/domain/entities';
import { IGameRepository } from '../../src/domain/ports/game-repository.port';

/**
 * In-memory stand-in for IGameRepository. Used to unit-test GamesService
 * without a real database — see ARCHITECTURE.md §13 ("application services
 * unit-tested against in-memory fake implementations of the ports").
 */
export class FakeGameRepository implements IGameRepository {
  readonly rows = new Map<string, GameState>();

  async findById(id: string): Promise<GameState | null> {
    return this.rows.get(id) ?? null;
  }

  async create(state: GameState): Promise<GameState> {
    this.rows.set(state.id, { ...state });
    return { ...state };
  }

  async save(state: GameState): Promise<GameState> {
    if (!this.rows.has(state.id)) {
      throw new Error(`FakeGameRepository.save: unknown game id "${state.id}"`);
    }
    this.rows.set(state.id, { ...state });
    return { ...state };
  }

  async saveMany(states: GameState[]): Promise<void> {
    for (const state of states) {
      await this.save(state);
    }
  }
}
