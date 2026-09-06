import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE, ICache } from '../domain/ports/cache.port';
import { IUserRepository, USER_REPOSITORY } from '../domain/ports/user-repository.port';
import { PaginatedResult, UserProfile } from '../domain/entities';
import { LEADERBOARD_CACHE_KEY } from './cache-keys';

/** Used whenever LEADERBOARD_TTL_SECONDS isn't set in the environment. */
const DEFAULT_LEADERBOARD_TTL_SECONDS = 15;

@Injectable()
export class UsersService {
  private readonly leaderboardTtlSeconds: number;

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: IUserRepository,
    @Inject(CACHE) private readonly cache: ICache,
    config: ConfigService,
  ) {
    const configured = config.get<string>('LEADERBOARD_TTL_SECONDS');
    const parsed = configured ? Number(configured) : NaN;
    this.leaderboardTtlSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_LEADERBOARD_TTL_SECONDS;
  }

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.users.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * Cache-aside, short TTL (LEADERBOARD_TTL_SECONDS env var, default 15s
   * — see README "Leaderboard pagination"), invalidated explicitly
   * whenever a game is won (ARCHITECTURE.md §9). The *entire* sorted list
   * is what's cached and fetched — one key, unaffected by which page is
   * requested — and `limit`/`offset` are applied afterwards, in memory,
   * rather than pushed into the query. That keeps invalidation simple
   * (any win invalidates the one cache key, full stop, regardless of
   * which pages are cached) at the cost of the cached list growing with
   * the whole user base rather than with the page size — an accepted
   * trade-off at this project's scale (see ARCHITECTURE.md §9 for the
   * full reasoning).
   */
  async getLeaderboard(limit = 10, offset = 0): Promise<PaginatedResult<UserProfile>> {
    let all = await this.cache.get<UserProfile[]>(LEADERBOARD_CACHE_KEY);
    if (!all) {
      all = await this.users.getLeaderboard();
      await this.cache.set(LEADERBOARD_CACHE_KEY, all, this.leaderboardTtlSeconds);
    }

    return {
      data: all.slice(offset, offset + limit),
      meta: { limit, total: all.length },
    };
  }

  /**
   * The seeded "house" opponent's profile — lets the frontend discover its
   * userId to start a game against it via the ordinary
   * `POST /games { opponentUserId }`, with no special-cased "vs bot" path
   * anywhere in game creation. 404 means `prisma/seed.ts` hasn't been run.
   */
  async getBotOpponent(): Promise<UserProfile> {
    const bot = await this.users.findBot();
    if (!bot) throw new NotFoundException('No bot opponent has been seeded — run `npx prisma db seed`.');
    return bot;
  }
}
