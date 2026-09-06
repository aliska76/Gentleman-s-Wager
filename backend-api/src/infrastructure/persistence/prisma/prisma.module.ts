import { Module } from '@nestjs/common';
import { GAME_REPOSITORY } from '../../../domain/ports/game-repository.port';
import { GAME_WRITE_BUFFER } from '../../../domain/ports/game-write-buffer.port';
import { USER_REPOSITORY } from '../../../domain/ports/user-repository.port';
import { BatchedGameWriteBuffer } from '../batched-game-write-buffer';
import { PrismaGameRepository } from './prisma-game.repository';
import { PrismaService } from './prisma.service';
import { PrismaUserRepository } from './prisma-user.repository';

@Module({
  providers: [
    PrismaService,
    { provide: GAME_REPOSITORY, useClass: PrismaGameRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: GAME_WRITE_BUFFER, useClass: BatchedGameWriteBuffer },
  ],
  exports: [PrismaService, GAME_REPOSITORY, USER_REPOSITORY, GAME_WRITE_BUFFER],
})
export class PrismaModule {}
