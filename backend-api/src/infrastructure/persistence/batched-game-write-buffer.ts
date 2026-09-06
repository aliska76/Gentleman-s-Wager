import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { GameState } from '../../domain/entities';
import { GAME_REPOSITORY, IGameRepository } from '../../domain/ports/game-repository.port';
import { IGameWriteBuffer } from '../../domain/ports/game-write-buffer.port';

/** Within the ~3–5s window ARCHITECTURE.md §8.3 calls for. */
const FLUSH_INTERVAL_MS = 4_000;

/**
 * In-memory queue, keyed by game id so a game that changes several times
 * between flushes (e.g. the bot rolling several times in a row) is still
 * written just once — the latest state wins, everything in between was
 * only ever "at risk" cache state anyway (see ARCHITECTURE.md §8.3/§8.6).
 *
 * Depends only on IGameRepository (the port), not on Prisma directly —
 * this class would work unchanged against any repository implementation
 * that can do a multi-row transactional write.
 */
@Injectable()
export class BatchedGameWriteBuffer implements IGameWriteBuffer, OnModuleDestroy {
  private readonly logger = new Logger(BatchedGameWriteBuffer.name);
  private readonly pending = new Map<string, GameState>();
  private readonly timer: NodeJS.Timeout;

  constructor(@Inject(GAME_REPOSITORY) private readonly games: IGameRepository) {
    this.timer = setInterval(() => {
      this.flush().catch((error) => this.logger.error(`Scheduled flush failed: ${(error as Error).message}`));
    }, FLUSH_INTERVAL_MS);
    // A live timer would otherwise keep the process (and every test run
    // that boots the real app) alive on its own even with nothing left to do.
    this.timer.unref?.();
  }

  enqueue(state: GameState): void {
    this.pending.set(state.id, state);
  }

  discard(gameId: string): void {
    this.pending.delete(gameId);
  }

  async flush(): Promise<void> {
    if (this.pending.size === 0) return;

    const batch = [...this.pending.values()];
    this.pending.clear();

    try {
      await this.games.saveMany(batch);
    } catch (error) {
      // Put them back for the next attempt instead of losing them — but
      // never clobber a newer state a fresh enqueue() already placed here
      // while this flush was in flight.
      for (const state of batch) {
        if (!this.pending.has(state.id)) this.pending.set(state.id, state);
      }
      this.logger.error(`Batch flush of ${batch.length} game(s) failed, will retry: ${(error as Error).message}`);
    }
  }

  /** Runs on SIGTERM/SIGINT via app.enableShutdownHooks() (main.ts) — ARCHITECTURE.md §8.4. */
  async onModuleDestroy(): Promise<void> {
    clearInterval(this.timer);
    await this.flush();
  }
}
