import { Injectable } from '@nestjs/common';
import { Game } from '@prisma/client';
import { GameState } from '../../../domain/entities';
import { IGameRepository } from '../../../domain/ports/game-repository.port';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaGameRepository implements IGameRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<GameState | null> {
    const row = await this.prisma.game.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async create(state: GameState): Promise<GameState> {
    const row = await this.prisma.game.create({ data: this.toRow(state) });
    return this.toDomain(row);
  }

  async save(state: GameState): Promise<GameState> {
    const row = await this.prisma.game.update({ where: { id: state.id }, data: this.toRow(state) });
    return this.toDomain(row);
  }

  /**
   * One transaction covering every game that changed — the point of
   * batching (ARCHITECTURE.md §8.3): fewer write-transactions/fsyncs under
   * concurrent writes, not fewer bytes written.
   */
  async saveMany(states: GameState[]): Promise<void> {
    if (states.length === 0) return;
    await this.prisma.$transaction(
      states.map((state) => this.prisma.game.update({ where: { id: state.id }, data: this.toRow(state) })),
    );
  }

  private toRow(state: GameState) {
    return {
      id: state.id,
      player1Id: state.player1Id,
      player2Id: state.player2Id,
      winningScore: state.winningScore,
      status: state.status,
      winnerId: state.winnerId,
      currentPlayerId: state.currentPlayerId,
      score1: state.score1,
      score2: state.score2,
      roundScore: state.roundScore,
    };
  }

  private toDomain(row: Game): GameState {
    return {
      id: row.id,
      player1Id: row.player1Id,
      player2Id: row.player2Id,
      winningScore: row.winningScore,
      status: row.status as GameState['status'],
      winnerId: row.winnerId,
      currentPlayerId: row.currentPlayerId,
      score1: row.score1,
      score2: row.score2,
      roundScore: row.roundScore,
    };
  }
}
