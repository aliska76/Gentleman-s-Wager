import { UserProfile } from '../entities';

export interface IUserRepository {
  findById(id: string): Promise<UserProfile | null>;
  findByUsername(username: string): Promise<UserProfile | null>;
  create(username: string): Promise<UserProfile>;
  incrementWins(userId: string): Promise<void>;
  /** Every user, sorted by wins descending — pagination (limit/offset) is applied by UsersService, not here (see ARCHITECTURE.md §9). */
  getLeaderboard(): Promise<UserProfile[]>;
  /** The single seeded "house" opponent, or null if it hasn't been seeded (see prisma/seed.ts). */
  findBot(): Promise<UserProfile | null>;
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
