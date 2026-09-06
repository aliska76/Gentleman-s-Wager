import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { GamesService } from '../../src/application/games.service';
import { NotAParticipantError } from '../../src/domain/errors';
import { FakeCache } from '../mocks/fake-cache';
import { FakeDiceRoller } from '../mocks/fake-dice-roller';
import { FakeGameRepository } from '../mocks/fake-game-repository';
import { FakeGameWriteBuffer } from '../mocks/fake-game-write-buffer';
import { FakeUserRepository } from '../mocks/fake-user-repository';

/**
 * Queues exact dice results on the fake roller — spying on a real method
 * of a real object (`dice.roll`) rather than mocking global `Math.random`
 * and reverse-engineering the floats that would produce a given face.
 */
function mockRolls(dice: FakeDiceRoller, ...pairs: Array<[number, number]>): jest.SpyInstance {
  const spy = jest.spyOn(dice, 'roll');
  pairs.forEach((pair) => spy.mockReturnValueOnce(pair));
  return spy;
}

describe('GamesService', () => {
  function setup() {
    const games = new FakeGameRepository();
    const users = new FakeUserRepository();
    const cache = new FakeCache();
    const dice = new FakeDiceRoller();
    const writeBuffer = new FakeGameWriteBuffer();
    const service = new GamesService(games, users, cache, dice, writeBuffer);
    const p1 = users.seed({ username: 'edmund' });
    const p2 = users.seed({ username: 'charlotte' });
    return { games, users, cache, dice, writeBuffer, service, p1, p2 };
  }

  describe('createGame', () => {
    it('rejects playing against yourself', async () => {
      const { service, p1 } = setup();
      await expect(service.createGame(p1.id, p1.id)).rejects.toThrow(ForbiddenException);
    });

    it('rejects an unknown opponent', async () => {
      const { service, p1 } = setup();
      await expect(service.createGame(p1.id, 'nobody')).rejects.toThrow(NotFoundException);
    });

    it('creates a fresh game and caches it', async () => {
      const { service, games, cache, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id, 50);

      expect(state.player1Id).toBe(p1.id);
      expect(state.player2Id).toBe(p2.id);
      expect(state.winningScore).toBe(50);
      expect(state.currentPlayerId).toBe(p1.id);
      expect(await games.findById(state.id)).toEqual(state);
      expect(await cache.get(`game:${state.id}`)).toEqual(state);
    });
  });

  describe('getGame', () => {
    it('throws for a game that does not exist', async () => {
      const { service, p1 } = setup();
      await expect(service.getGame('missing', p1.id)).rejects.toThrow(NotFoundException);
    });

    it('throws NotAParticipantError for someone outside the game', async () => {
      const { service, users, p1, p2 } = setup();
      const outsider = users.seed({ username: 'bystander' });
      const state = await service.createGame(p1.id, p2.id);
      await expect(service.getGame(state.id, outsider.id)).rejects.toThrow(NotAParticipantError);
    });

    it('serves a cache hit without touching the repository', async () => {
      const { service, games, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      const findSpy = jest.spyOn(games, 'findById');

      await service.getGame(state.id, p1.id);

      expect(findSpy).not.toHaveBeenCalled();
    });
  });

  describe('roll — event-driven persistence (ARCHITECTURE.md §8)', () => {
    it('a non-bust roll only updates the cache, not the database', async () => {
      const { service, games, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      const saveSpy = jest.spyOn(games, 'save');

      mockRolls(dice, [2, 3]);
      const outcome = await service.roll(state.id, p1.id);

      expect(outcome.busted).toBe(false);
      expect(outcome.state.roundScore).toBe(5);
      expect(saveSpy).not.toHaveBeenCalled();
    });

    it('a bust (6 & 6) is a turn boundary — queued for the batched flush, not written through (§8.3)', async () => {
      const { service, games, writeBuffer, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      const saveSpy = jest.spyOn(games, 'save');

      mockRolls(dice, [6, 6]);
      const outcome = await service.roll(state.id, p1.id);

      expect(outcome.busted).toBe(true);
      expect(outcome.state.roundScore).toBe(0);
      expect(outcome.state.currentPlayerId).toBe(p2.id);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(writeBuffer.pending.get(state.id)).toEqual(outcome.state);
    });

    it('degrades to writing through on every roll when the cache is unavailable', async () => {
      const { service, games, cache, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      cache.setAvailable(false);
      const saveSpy = jest.spyOn(games, 'save');

      mockRolls(dice, [1, 2]); // deliberately not a bust
      const outcome = await service.roll(state.id, p1.id);

      expect(outcome.busted).toBe(false);
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });

    it('rejects a roll from the player who is not on turn', async () => {
      const { service, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      mockRolls(dice, [3, 3]);
      await expect(service.roll(state.id, p2.id)).rejects.toThrow();
    });
  });

  describe('hold', () => {
    it('is a turn boundary — queued for the batched flush (§8.3) — and passes the turn without winning', async () => {
      const { service, games, writeBuffer, users, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id, 100);
      const saveSpy = jest.spyOn(games, 'save');
      const winSpy = jest.spyOn(users, 'incrementWins');

      mockRolls(dice, [4, 3]);
      await service.roll(state.id, p1.id); // roundScore = 7 (non-bust: cache only, nothing queued yet)

      const after = await service.hold(state.id, p1.id);

      expect(after.score1).toBe(7);
      expect(after.status).toBe('IN_PROGRESS');
      expect(after.currentPlayerId).toBe(p2.id);
      expect(saveSpy).not.toHaveBeenCalled();
      expect(writeBuffer.pending.get(state.id)).toEqual(after);
      expect(winSpy).not.toHaveBeenCalled();
    });

    it('declares a winner, credits the win, and invalidates the leaderboard cache', async () => {
      const { service, games, writeBuffer, users, cache, dice, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id, 5);
      await cache.set('leaderboard', [{ id: p1.id, username: p1.username, wins: 0, avatarId: 1 }]);
      const saveSpy = jest.spyOn(games, 'save');
      const winSpy = jest.spyOn(users, 'incrementWins');
      const cacheDelSpy = jest.spyOn(cache, 'del');

      mockRolls(dice, [3, 3]); // roundScore = 6, past the winning score of 5
      await service.roll(state.id, p1.id);
      const after = await service.hold(state.id, p1.id);

      expect(after.status).toBe('FINISHED');
      expect(after.winnerId).toBe(p1.id);
      // A win always writes through immediately (§8.2) — never queued, unlike an ordinary hold.
      expect(saveSpy).toHaveBeenCalledWith(after);
      expect(writeBuffer.pending.has(state.id)).toBe(false);
      expect(winSpy).toHaveBeenCalledWith(p1.id);
      expect(cacheDelSpy).toHaveBeenCalledWith('leaderboard');
      expect(await cache.get('leaderboard')).toBeNull();
    });
  });

  describe('botTurn', () => {
    it('rejects when the current player is not the bot', async () => {
      const { service, p1, p2 } = setup();
      const state = await service.createGame(p1.id, p2.id);
      await expect(service.botTurn(state.id, p1.id)).rejects.toThrow(ForbiddenException);
    });

    it('rolls once when below the hold threshold, touching only the cache', async () => {
      const { service, games, writeBuffer, users, dice, p1 } = setup();
      const bot = users.seed({ username: 'AI', isBot: true });
      const state = await service.createGame(p1.id, bot.id);
      await service.hold(state.id, p1.id); // createGame always starts with player1's turn — pass it to the bot
      writeBuffer.pending.clear(); // that opening hold queued a write of its own — isolate this roll's effect
      const saveSpy = jest.spyOn(games, 'save');

      mockRolls(dice, [2, 3]); // roundScore -> 5, well below the default threshold of 20
      const result = await service.botTurn(state.id, p1.id);

      expect(result.action).toBe('roll');
      expect(result.busted).toBe(false);
      expect(result.state.roundScore).toBe(5);
      expect(result.state.currentPlayerId).toBe(bot.id); // still the bot's turn
      expect(saveSpy).not.toHaveBeenCalled();
      expect(writeBuffer.pending.size).toBe(0); // a non-bust roll doesn't even queue a write
    });

    it('holds once the round score reaches the threshold — a turn boundary, queued for the batched flush (§8.3)', async () => {
      const { service, games, writeBuffer, users, dice, p1 } = setup();
      const bot = users.seed({ username: 'AI', isBot: true });
      const state = await service.createGame(p1.id, bot.id, 100);
      await service.hold(state.id, p1.id); // pass the opening turn to the bot

      mockRolls(dice, [6, 4]); // roundScore -> 10
      await service.botTurn(state.id, p1.id);
      mockRolls(dice, [5, 5]); // roundScore -> 20, meets the default threshold
      await service.botTurn(state.id, p1.id);

      const saveSpy = jest.spyOn(games, 'save');
      const result = await service.botTurn(state.id, p1.id); // decides to hold

      expect(result.action).toBe('hold');
      expect(result.state.score2).toBe(20);
      expect(result.state.roundScore).toBe(0);
      expect(result.state.currentPlayerId).toBe(p1.id); // turn passed back to the human
      expect(saveSpy).not.toHaveBeenCalled();
      expect(writeBuffer.pending.get(state.id)).toEqual(result.state);
    });

    it('credits a bot win exactly like a human win', async () => {
      const { service, games, writeBuffer, users, dice, p1 } = setup();
      const bot = users.seed({ username: 'AI', isBot: true });
      const state = await service.createGame(p1.id, bot.id, 5);
      await service.hold(state.id, p1.id); // pass the opening turn to the bot
      const saveSpy = jest.spyOn(games, 'save');
      const winSpy = jest.spyOn(users, 'incrementWins');

      mockRolls(dice, [3, 3]); // roundScore -> 6, past the winning score of 5
      const rollResult = await service.botTurn(state.id, p1.id);
      expect(rollResult.action).toBe('roll');

      const holdResult = await service.botTurn(state.id, p1.id); // projected score already >= 5 -> holds early

      expect(holdResult.action).toBe('hold');
      expect(holdResult.state.status).toBe('FINISHED');
      expect(holdResult.state.winnerId).toBe(bot.id);
      // A bot win writes through immediately too — same rule as a human win (§8.2).
      expect(saveSpy).toHaveBeenCalledWith(holdResult.state);
      expect(writeBuffer.pending.has(state.id)).toBe(false);
      expect(winSpy).toHaveBeenCalledWith(bot.id);
    });
  });

  describe('newGame', () => {
    it('starts a fresh game between the same two players', async () => {
      const { service, dice, p1, p2 } = setup();
      const first = await service.createGame(p1.id, p2.id, 100);
      mockRolls(dice, [5, 5]);
      await service.roll(first.id, p1.id);
      await service.hold(first.id, p1.id);

      const restarted = await service.newGame(first.id, p1.id, 30);

      expect(restarted.id).not.toBe(first.id);
      expect(restarted.player1Id).toBe(p1.id);
      expect(restarted.player2Id).toBe(p2.id);
      expect(restarted.winningScore).toBe(30);
      expect(restarted.score1).toBe(0);
      expect(restarted.score2).toBe(0);
      expect(restarted.status).toBe('IN_PROGRESS');
    });
  });
});
