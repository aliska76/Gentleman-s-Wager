import * as path from 'path';

// Runs before the e2e test module loads (via jest-e2e.json "setupFiles").
// A dedicated SQLite file keeps e2e runs from ever touching whatever
// `dev.db` a developer is using locally, and from fighting over a SQLite
// file lock with a `npm run start:dev` running at the same time.
//
// The path is resolved with `path.join(__dirname, ...)` — i.e. an
// *absolute* path — rather than a relative "file:./test.db" string.
// Prisma's relative-path resolution for SQLite differs between the CLI
// (relative to schema.prisma) and the generated client at runtime
// (relative to process.cwd()); an absolute path sidesteps that
// discrepancy entirely, so the exact same file is used no matter how or
// from where the process is launched. `scripts/push-test-db.js` computes
// this same path before `test:e2e` runs, so the schema is pushed to the
// file this process will actually open.
// Forward slashes even on Windows: Prisma's SQLite `file:` URLs are picky
// about backslashes, and this exact normalization is mirrored in
// `scripts/push-test-db.js` so both resolve to the identical URL string.
const TEST_DB_PATH = path.join(__dirname, 'test.db').split(path.sep).join('/');

process.env.DATABASE_URL = process.env.DATABASE_URL ?? `file:${TEST_DB_PATH}`;
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret-e2e';
// Deliberately left unset: REDIS_URL. The point of the graceful-degradation
// design (RedisCacheService / ICache.isAvailable) is that the API works
// correctly with no cache reachable at all — these e2e runs are also a
// live check of that claim.
