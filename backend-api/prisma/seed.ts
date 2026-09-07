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

/**
 * A couple of non-bot users with a few wins already on the board, purely
 * so `GET /leaderboard` (and the Leaderboard screen) isn't an empty state
 * the very first time someone opens this project — a fresh clone otherwise
 * has zero users and zero games. These are also the exact usernames used
 * in backend-api/README.md's curl walkthrough, so following that walkthrough
 * plays against/as users that already exist rather than colliding with
 * brand-new ones.
 *
 * Deliberately just User rows with a `wins` count, not full seeded Game
 * rows: the frontend only ever resumes a game it already knows the id of
 * (see App.tsx's `roeto:activeGameId`, stored per-browser in localStorage),
 * so a seeded Game row would be reachable only by calling the API with its
 * id directly — invisible through the UI to anyone who didn't seed it.
 * Wins, by contrast, show up immediately in the leaderboard for anyone.
 */
const DEMO_LEADERBOARD_USERS = [
  { username: 'edmund', wins: 3, avatarId: 2 },
  { username: 'charlotte', wins: 1, avatarId: 3 },
];

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const existingBot = await prisma.user.findFirst({ where: { isBot: true } });
    const bot = existingBot
      ? await prisma.user.update({ where: { id: existingBot.id }, data: { username: BOT_USERNAME } })
      : await prisma.user.create({
          data: { id: randomUUID(), username: BOT_USERNAME, isBot: true, avatarId: 1 },
        });
    console.log(`Bot opponent ready: ${bot.username} (${bot.id})`);

    for (const demo of DEMO_LEADERBOARD_USERS) {
      const user = await prisma.user.upsert({
        where: { username: demo.username },
        update: { wins: demo.wins, avatarId: demo.avatarId },
        create: { id: randomUUID(), username: demo.username, wins: demo.wins, avatarId: demo.avatarId },
      });
      console.log(`Demo leaderboard user ready: ${user.username} (${user.wins} wins)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
