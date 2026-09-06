import { GameState } from '../../src/domain/entities';
import { IGameWriteBuffer } from '../../src/domain/ports/game-write-buffer.port';

/**
 * In-memory stand-in for IGameWriteBuffer. Deliberately has no timer of its
 * own — tests call `flush()` explicitly when they want to observe a batch
 * actually landing, and otherwise just inspect `.pending` directly to
 * assert that a turn-boundary write was queued rather than written through.
 */
export class FakeGameWriteBuffer implements IGameWriteBuffer {
  readonly pending = new Map<string, GameState>();

  enqueue(state: GameState): void {
    this.pending.set(state.id, state);
  }

  discard(gameId: string): void {
    this.pending.delete(gameId);
  }

  async flush(): Promise<void> {
    this.pending.clear();
  }
}
