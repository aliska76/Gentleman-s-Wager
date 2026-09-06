import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../src/application/users.service';
import { LEADERBOARD_CACHE_KEY } from '../../src/application/cache-keys';
import { FakeCache } from '../mocks/fake-cache';
import { FakeUserRepository } from '../mocks/fake-user-repository';

const DEFAULT_LEADERBOARD_TTL_SECONDS = 15;

describe('UsersService', () => {
  /**
   * `leaderboardTtlSeconds` simulates what would be read from the
   * LEADERBOARD_TTL_SECONDS environment variable (see .env.example) —
   * `undefined` means "not set", matching ConfigService.get()'s real
   * behaviour for a missing key.
   */
  function setup(options: { leaderboardTtlSeconds?: string } = {}) {
    const users = new FakeUserRepository();
    const cache = new FakeCache();
    const config = {
      get: (key: string) => (key === 'LEADERBOARD_TTL_SECONDS' ? options.leaderboardTtlSeconds : undefined),
    } as unknown as ConfigService;
    const service = new UsersService(users, cache, config);
    return { users, cache, service };
  }

  it('returns a profile by id', async () => {
    const { users, service } = setup();
    const user = users.seed({ username: 'charlotte', wins: 3 });

    const profile = await service.getProfile(user.id);
    expect(profile).toEqual(user);
  });

  it('throws NotFoundException for an unknown user', async () => {
    const { service } = setup();
    await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
  });

  describe('getLeaderboard', () => {
    it('serves the leaderboard from cache on a hit, without touching the repository', async () => {
      const { users, service } = setup();
      users.seed({ username: 'edmund', wins: 7 });
      users.seed({ username: 'charlotte', wins: 5 });

      const repoSpy = jest.spyOn(users, 'getLeaderboard');

      const first = await service.getLeaderboard(10); // cache miss -> hits repository
      expect(repoSpy).toHaveBeenCalledTimes(1);
      expect(first.data[0].username).toBe('edmund');

      const second = await service.getLeaderboard(10); // cache hit -> repository not called again
      expect(repoSpy).toHaveBeenCalledTimes(1);
      expect(second).toEqual(first);
    });

    it('returns meta.total as the whole leaderboard size, not just the page size', async () => {
      const { users, service } = setup();
      for (let i = 0; i < 15; i += 1) {
        users.seed({ username: `player-${i}`, wins: 15 - i }); // player-0 has the most wins
      }

      const page = await service.getLeaderboard(10, 0);

      expect(page.data).toHaveLength(10);
      expect(page.meta).toEqual({ limit: 10, total: 15 });
    });

    it('applies offset against the same cached full list, defaults included', async () => {
      const { users, service } = setup();
      for (let i = 0; i < 15; i += 1) {
        users.seed({ username: `player-${i}`, wins: 15 - i });
      }

      const firstPage = await service.getLeaderboard(); // defaults: limit 10, offset 0
      const secondPage = await service.getLeaderboard(10, 10);

      expect(firstPage.data).toHaveLength(10);
      expect(firstPage.data[0].username).toBe('player-0');
      expect(secondPage.data).toHaveLength(5); // only 15 players total, 5 left after the first 10
      expect(secondPage.data[0].username).toBe('player-10');
      expect(secondPage.meta).toEqual({ limit: 10, total: 15 });
    });
  });

  describe('leaderboard cache TTL configuration', () => {
    it('defaults to 15s when LEADERBOARD_TTL_SECONDS is not set', async () => {
      const { users, cache, service } = setup();
      users.seed({ username: 'edmund', wins: 1 });
      const setSpy = jest.spyOn(cache, 'set');

      await service.getLeaderboard();

      expect(setSpy).toHaveBeenCalledWith(LEADERBOARD_CACHE_KEY, expect.any(Array), DEFAULT_LEADERBOARD_TTL_SECONDS);
    });

    it('uses LEADERBOARD_TTL_SECONDS from the environment when set', async () => {
      const { users, cache, service } = setup({ leaderboardTtlSeconds: '60' });
      users.seed({ username: 'edmund', wins: 1 });
      const setSpy = jest.spyOn(cache, 'set');

      await service.getLeaderboard();

      expect(setSpy).toHaveBeenCalledWith(LEADERBOARD_CACHE_KEY, expect.any(Array), 60);
    });

    it('falls back to the default when LEADERBOARD_TTL_SECONDS is not a valid positive number', async () => {
      const { users, cache, service } = setup({ leaderboardTtlSeconds: 'not-a-number' });
      users.seed({ username: 'edmund', wins: 1 });
      const setSpy = jest.spyOn(cache, 'set');

      await service.getLeaderboard();

      expect(setSpy).toHaveBeenCalledWith(LEADERBOARD_CACHE_KEY, expect.any(Array), DEFAULT_LEADERBOARD_TTL_SECONDS);
    });
  });

  describe('getBotOpponent', () => {
    it('returns the seeded bot user', async () => {
      const { users, service } = setup();
      const bot = users.seed({ username: 'AI', isBot: true });

      const found = await service.getBotOpponent();

      expect(found).toEqual(bot);
    });

    it('throws NotFoundException when no bot has been seeded', async () => {
      const { service } = setup();
      await expect(service.getBotOpponent()).rejects.toThrow(NotFoundException);
    });
  });
});
