import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from '@prisma/client';
import { UserProfile } from '../../../domain/entities';
import { IUserRepository } from '../../../domain/ports/user-repository.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<UserProfile | null> {
    const row = await this.prisma.user.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByUsername(username: string): Promise<UserProfile | null> {
    const row = await this.prisma.user.findUnique({ where: { username } });
    return row ? this.toDomain(row) : null;
  }

  async create(username: string): Promise<UserProfile> {
    const row = await this.prisma.user.create({
      data: { id: randomUUID(), username, wins: 0, avatarId: 1 + Math.floor(Math.random() * 6) },
    });
    return this.toDomain(row);
  }

  async incrementWins(userId: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { wins: { increment: 1 } } });
  }

  async getLeaderboard(): Promise<UserProfile[]> {
    // Ties (equal wins) break newest-account-first — createdAt desc — so a
    // freshly-created player doesn't get buried behind long-time 0-win
    // accounts; without this, SQLite falls back to insertion order (oldest
    // first), which reads backwards on the leaderboard.
    const rows = await this.prisma.user.findMany({ orderBy: [{ wins: 'desc' }, { createdAt: 'desc' }] });
    return rows.map((row) => this.toDomain(row));
  }

  async findBot(): Promise<UserProfile | null> {
    const row = await this.prisma.user.findFirst({ where: { isBot: true } });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: User): UserProfile {
    return { id: row.id, username: row.username, wins: row.wins, avatarId: row.avatarId, isBot: row.isBot };
  }
}
