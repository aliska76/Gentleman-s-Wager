import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

/**
 * Idempotent: ensures exactly one "house" bot opponent User row exists,
 * with this username. Keyed on the `isBot` flag rather than the username
 * itself — so renaming BOT_USERNAME (as happened once already, croupier ->
 * AI) updates the existing row in place instead of leaving the old name
 * behind as an orphaned duplicate bot account.
 * Run via `npx prisma db seed` (wired up in package.json's "prisma.seed").
 * See ARCHITECTURE.md §9b for why the bot is a real seeded User row
 * rather than a hardcoded sentinel id scattered through the code.
 */
const BOT_USERNAME = 'AI';

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const existing = await prisma.user.findFirst({ where: { isBot: true } });
    const bot = existing
      ? await prisma.user.update({ where: { id: existing.id }, data: { username: BOT_USERNAME } })
      : await prisma.user.create({
          data: { id: randomUUID(), username: BOT_USERNAME, isBot: true, avatarId: 1 },
        });
    // eslint-disable-next-line no-console
    console.log(`Bot opponent ready: ${bot.username} (${bot.id})`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
