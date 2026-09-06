import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.enableWalMode();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * WAL replaces SQLite's default rollback-journal mode: readers no longer
   * block writers (or vice versa), and a write is a cheap sequential
   * append to a `*-wal` log file rather than an in-place update of the
   * main database file, which is also what makes BatchedGameWriteBuffer's
   * multi-row transaction (ARCHITECTURE.md §8.3) cheap to run without
   * stalling concurrent reads. See ARCHITECTURE.md §8.5.
   *
   * This is a SQLite database-file property, not a Prisma connection
   * option, so it's set via a raw PRAGMA rather than anything in
   * schema.prisma. It's recorded in the database file itself, so this is
   * a fast no-op on every startup after the very first one.
   */
  private async enableWalMode(): Promise<void> {
    try {
      await this.$queryRaw`PRAGMA journal_mode=WAL;`;
    } catch (error) {
      // Never block startup over this — worst case, SQLite stays on its
      // default journal mode and everything still works, just without the
      // reduced read/write contention.
      this.logger.warn(`Could not enable SQLite WAL mode: ${(error as Error).message}`);
    }
  }
}
