import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CACHE, ICache } from '../domain/ports/cache.port';
import { DICE_ROLLER, IDiceRoller } from '../domain/ports/dice-roller.port';
import { GAME_REPOSITORY, IGameRepository } from '../domain/ports/game-repository.port';
import { GAME_WRITE_BUFFER, IGameWriteBuffer } from '../domain/ports/game-write-buffer.port';
import { IUserRepository, USER_REPOSITORY } from '../domain/ports/user-repository.port';
import { createGame, hold, roll } from '../domain/game-engine';
import { decideBotMove } from '../domain/bot-policy';
import { BotTurnResult, DEFAULT_WINNING_SCORE, GameState, RollOutcome } from '../domain/entities';
import { CannotPlaySelfError, NotAParticipantError, NotBotsTurnError } from '../domain/errors';
import { gameCacheKey, LEADERBOARD_CACHE_KEY } from './cache-keys';

const GAME_CACHE_TTL_SECONDS = 300;

/**
 * Orchestrates domain + repository + cache. Contains no game rules itself —
 * those live entirely in domain/game-engine.ts (and, for the computer
 * opponent's decisions, domain/bot-policy.ts). See ARCHITECTURE.md §8 for
 * the persistence strategy this implements (event-driven writes at turn
 * boundaries, with graceful degradation when the cache is unavailable).
 */
@Injectable()
export class GamesService {
  constructor(
    @Inject(GAME_REPOSITORY) private readonly games: IGameRepository,
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CACHE) private readonly cache: ICache,
    @Inject(DICE_ROLLER) private readonly dice: IDiceRoller,
    @Inject(GAME_WRITE_BUFFER) private readonly writeBuffer: IGameWriteBuffer,
  ) {}

  async createGame(requesterId: string, opponentUserId: string, winningScore = DEFAULT_WINNING_SCORE): Promise<GameState> {
    if (opponentUserId === requesterId) {
      throw new CannotPlaySelfError();
    }
    const opponent = await this.users.findById(opponentUserId);
    if (!opponent) throw new NotFoundException('Opponent not found');

    const state = createGame(randomUUID(), requesterId, opponentUserId, winningScore);
    const saved = await this.games.create(state);
    await this.cache.set(gameCacheKey(saved.id), saved, GAME_CACHE_TTL_SECONDS);
    return saved;
  }

  async getGame(gameId: string, requesterId: string): Promise<GameState> {
    const state = await this.loadState(gameId);
    this.assertParticipant(state, requesterId);
    return state;
  }

  async roll(gameId: string, requesterId: string): Promise<RollOutcome> {
    const state = await this.getGame(gameId, requesterId);
    return this.applyRoll(state, requesterId);
  }

  async hold(gameId: string, requesterId: string): Promise<GameState> {
    const state = await this.getGame(gameId, requesterId);
    return this.applyHold(state, requesterId);
  }

  /**
   * Advances the computer opponent by exactly one action (one roll, or a
   * hold) — never a whole turn in one call. `requesterId` is the human
   * calling this (any participant may prompt the bot to move; the bot
   * itself never makes HTTP calls), used only for the same participant
   * check every other endpoint applies. The frontend calls this
   * repeatedly, with a short delay between calls, to animate the bot
   * "thinking" and rolling one die at a time like a real opponent.
   */
  async botTurn(gameId: string, requesterId: string): Promise<BotTurnResult> {
    const state = await this.getGame(gameId, requesterId);
    const botId = state.currentPlayerId;
    await this.assertIsBot(botId);

    const decision = decideBotMove(state, botId);
    if (decision.action === 'hold') {
      const newState = await this.applyHold(state, botId);
      return { action: 'hold', state: newState };
    }

    const outcome = await this.applyRoll(state, botId);
    return { action: 'roll', dice: outcome.dice, busted: outcome.busted, state: outcome.state };
  }

  async newGame(gameId: string, requesterId: string, winningScore?: number): Promise<GameState> {
    const previous = await this.getGame(gameId, requesterId);
    const state = createGame(
      randomUUID(),
      previous.player1Id,
      previous.player2Id,
      winningScore ?? previous.winningScore,
    );
    const saved = await this.games.create(state);
    await this.cache.set(gameCacheKey(saved.id), saved, GAME_CACHE_TTL_SECONDS);
    return saved;
  }

  /**
   * Shared by the human-facing `roll()` and the bot's `botTurn()` — same
   * event-driven persistence either way (see ARCHITECTURE.md §8): a plain
   * roll only touches the cache; a bust is a turn boundary, queued for the
   * next batched flush (§8.3) since the cache already holds it durably
   * enough to survive until then. With no cache to fall back on, every
   * roll — bust or not — must be written through immediately instead, and
   * `discard` clears out anything queued earlier for this game so a stale
   * batched write can never land on top of this fresher one later.
   */
  private async applyRoll(state: GameState, actingUserId: string): Promise<RollOutcome> {
    const outcome = roll(state, actingUserId, () => this.dice.roll());

    await this.cache.set(gameCacheKey(state.id), outcome.state, GAME_CACHE_TTL_SECONDS);
    if (!this.cache.isAvailable()) {
      await this.games.save(outcome.state);
      this.writeBuffer.discard(outcome.state.id);
    } else if (outcome.busted) {
      this.writeBuffer.enqueue(outcome.state);
    }

    return outcome;
  }

  /**
   * Shared by the human-facing `hold()` and the bot's `botTurn()`. A win is
   * always written through immediately (§8.2) — it's also the one case
   * where there's a second write (crediting the winner), so it can't be
   * queued independently of that anyway. An ordinary hold is a turn
   * boundary like a bust: queued for the batched flush when the cache is
   * up, written through immediately when it isn't (same reasoning as
   * applyRoll above) — and every immediate write discards anything queued
   * earlier for this game, for the same reason.
   */
  private async applyHold(state: GameState, actingUserId: string): Promise<GameState> {
    const newState = hold(state, actingUserId);
    await this.cache.set(gameCacheKey(state.id), newState, GAME_CACHE_TTL_SECONDS);

    if (newState.status === 'FINISHED' && newState.winnerId) {
      // The single most valuable event in a game is never left to a timer.
      await this.games.save(newState);
      this.writeBuffer.discard(newState.id);
      await this.users.incrementWins(newState.winnerId);
      await this.cache.del(LEADERBOARD_CACHE_KEY);
    } else if (!this.cache.isAvailable()) {
      await this.games.save(newState);
      this.writeBuffer.discard(newState.id);
    } else {
      this.writeBuffer.enqueue(newState);
    }

    return newState;
  }

  private async loadState(gameId: string): Promise<GameState> {
    const cached = await this.cache.get<GameState>(gameCacheKey(gameId));
    if (cached) return cached;

    const persisted = await this.games.findById(gameId);
    if (!persisted) throw new NotFoundException('Game not found');

    await this.cache.set(gameCacheKey(gameId), persisted, GAME_CACHE_TTL_SECONDS);
    return persisted;
  }

  private assertParticipant(state: GameState, userId: string): void {
    if (state.player1Id !== userId && state.player2Id !== userId) {
      throw new NotAParticipantError();
    }
  }

  private async assertIsBot(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.isBot) {
      throw new NotBotsTurnError();
    }
  }
}
