/**
 * Pushes the Prisma schema to the dedicated e2e test SQLite file, before
 * `npm run test:e2e` starts (wired up as the `pretest:e2e` npm lifecycle
 * script in package.json).
 *
 * Why a script instead of an inline `DATABASE_URL=... prisma db push` in
 * package.json: that syntax only works in POSIX shells (bash/zsh) and
 * breaks on Windows cmd.exe/PowerShell, which this project needs to
 * support. A plain Node script runs identically everywhere npm itself
 * runs.
 *
 * The path is computed with `path.join(__dirname, ...)` so it always
 * resolves to `test/e2e/test.db` relative to this file, regardless of
 * the shell's current working directory — and normalized to forward
 * slashes for Prisma's SQLite `file:` URL parser. `test/e2e/setup-env.ts`
 * computes the exact same absolute path independently (from its own
 * `__dirname`), so the schema this script pushes and the database the
 * e2e test process opens are always the same file.
 */
const { execSync } = require('child_process');
const path = require('path');

const testDbPath = path
  .join(__dirname, '..', 'test', 'e2e', 'test.db')
  .split(path.sep)
  .join('/');

const databaseUrl = `file:${testDbPath}`;

console.log(`[push-test-db] Pushing Prisma schema to ${databaseUrl}`);

const env = { ...process.env, DATABASE_URL: databaseUrl };

execSync('npx prisma db push --skip-generate', { stdio: 'inherit', env });

// Seeds the same idempotent bot user (`prisma/seed.ts`) into the e2e
// database as `npx prisma db seed` does for dev.db — e2e tests exercise
// GET /users/bot and POST /games/:id/bot-turn against a real seeded row,
// not a special-cased test fixture, so the wiring being tested is the
// same wiring a developer running the app for real would hit.
console.log('[push-test-db] Seeding bot opponent');
execSync('npx prisma db seed', { stdio: 'inherit', env });
