import { randomUUID } from 'crypto';
import { UserProfile } from '../../src/domain/entities';
import { IUserRepository } from '../../src/domain/ports/user-repository.port';

export class FakeUserRepository implements IUserRepository {
  readonly rows = new Map<string, UserProfile>();

  /** Test convenience — most specs seed a couple of users up front. */
  seed(user: Partial<UserProfile> & { username: string }): UserProfile {
    const full: UserProfile = {
      id: user.id ?? randomUUID(),
      username: user.username,
      wins: user.wins ?? 0,
      avatarId: user.avatarId ?? 1,
      isBot: user.isBot ?? false,
    };
    this.rows.set(full.id, full);
    return full;
  }

  async findById(id: string): Promise<UserProfile | null> {
    return this.rows.get(id) ?? null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    for (const user of this.rows.values()) {
      if (user.username === username) return user;
    }
    return null;
  }

  async create(username: string): Promise<UserProfile> {
    return this.seed({ username });
  }

  async incrementWins(userId: string): Promise<void> {
    const user = this.rows.get(userId);
    if (!user) throw new Error(`FakeUserRepository.incrementWins: unknown user "${userId}"`);
    this.rows.set(userId, { ...user, wins: user.wins + 1 });
  }

  async getLeaderboard(): Promise<UserProfile[]> {
    return [...this.rows.values()].sort((a, b) => b.wins - a.wins);
  }

  async findBot(): Promise<UserProfile | null> {
    for (const user of this.rows.values()) {
      if (user.isBot) return user;
    }
    return null;
  }
}
