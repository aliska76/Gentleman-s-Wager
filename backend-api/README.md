# Gentleman's Wager — API

NestJS backend implementing all rules for the dice game described in
`roeto-home-assignment.pdf`. See `ARCHITECTURE.md` (repo root of the
`Roeto` project) for the full design rationale — this file is just
"how do I run it".

## Layout

```
src/
  domain/            Pure game rules — no NestJS/Prisma/Redis imports at all.
  application/        Use-case services orchestrating domain + ports.
  infrastructure/      Concrete adapters: Prisma repositories, Redis cache, mock auth.
  modules/             NestJS wiring: controllers, DI bindings, guards.
  common/               Auth guard, current-user decorator, domain-error → HTTP mapping.
```

## Running it locally

This was written and unit-tested in a sandboxed environment whose network
egress does not reach the npm registry, so `npm install` could not be
verified from inside that sandbox. Run these where you have normal
internet access (a regular terminal on your machine):

```bash
cd backend-api
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run start:dev
```

The API listens on `http://localhost:3000`. Redis is optional in dev —
without `REDIS_URL` reachable, the app still works correctly, just
without the cache speed-up (see `RedisCacheService` / `ICache.isAvailable`).

Interactive API docs (Swagger/OpenAPI) are served at
`http://localhost:3000/docs` — generated from the `@ApiTags`/`@ApiOperation`/
`@ApiProperty` decorators on the controllers and DTOs, so it stays in sync
with the actual code rather than being hand-maintained. `/health/*` is
included there too (easiest way to poke it during review), but still
tagged separately from the game/auth/user contract.

Every route is rate-limited (`@nestjs/throttler`, global default 30
req/60s per client). `POST /auth/login` has its own, stricter limit (10
req/60s) since it's the one endpoint reachable without a token;
`POST /games/:id/roll` and `/hold` have a higher one (120 req/60s) since a
single turn is a fast burst of rolls; `/health/*` skips rate limiting
entirely (`@SkipThrottle`) so k8s probes are never mistaken for abuse.

Dice rolls go through `@dice-roller/rpg-dice-roller` — a dedicated,
independently-tested dice engine — instead of hand-rolled `Math.random`
arithmetic (see ARCHITECTURE.md §9a). Its default RNG engine is `Math.random`
too, so the library alone doesn't change randomness quality — what does is
explicitly switching its engine to Node's crypto source
(`NumberGenerator.generator.engine = NumberGenerator.engines.nodeCrypto`,
set once at module load): `Math.random` isn't cryptographically secure, so
its output could in principle be predicted from enough prior rolls, which
is worth avoiding in a game literally branded around a wager. If the
library ever throws, `GracefulDiceRollerAdapter` logs a warning and
transparently falls back to the original `Math.random`-based roll; the
game is never blocked on it. 

You can try the library itself (dice notation, modifiers, the works) in its official interactive demo: https://dice-roller.github.io/documentation/.

## Demo data

`prisma/dev.db` itself is deliberately **not** committed to git (see
`.gitignore`) — it's a binary SQLite file tied to whatever migration
state it was created under, it can silently stop opening after a schema
change nobody remembers to regenerate it for, and committing it would
mean shipping one person's local test data as if it were fixtures.
`prisma/migrations/` (which *is* committed) is the actual source of
truth for the schema; the database file is just derived from it.

Instead, `npm run db:seed` (`npx prisma db seed` under the hood) does
two idempotent things every time it runs:

1. Ensures the seeded "house" AI opponent user exists (see
   ARCHITECTURE.md §9b) — required for `POST /games` against the bot and
   for `botTurn` to work at all.
2. Upserts two demo users (`edmund`, `charlotte` — the same usernames
   used in the curl walkthrough below) with a few wins already on the
   board, purely so `GET /leaderboard` isn't a blank slate the first
   time anyone opens this project.

It only ever touches `User` rows, not `Game` rows: the frontend resumes
a game solely by an id it already has in its own browser's
`localStorage` (`App.tsx`'s `roeto:activeGameId`), so a seeded `Game`
row would be reachable only by calling the API with its id directly —
invisible through the UI to anyone who didn't seed it themselves. Wins
on a user, by contrast, show up in the leaderboard for anyone, immediately.

Running it again later (e.g. after wiping your dev DB) is always safe —
every write is an upsert keyed on a stable field (`isBot`, `username`),
never a blind `create`.

Docker already runs this on every container start (see the `Dockerfile`'s
`CMD`), so this step is only something you do by hand when running the
API outside Docker.

## Persistence: batched writes + WAL mode

Two optimizations on top of the event-driven writes described above (full
rationale and trade-offs in ARCHITECTURE.md §8):

**Batched flush.** An ordinary Hold or a Bust is already durable in the
Redis cache the moment it happens, so instead of writing it straight to
SQLite, `GamesService` hands it to `IGameWriteBuffer` (implemented by
`BatchedGameWriteBuffer`), which queues it in memory and flushes everything
queued — for every game, not just this one — in a single transaction every
~4 seconds. A game queued more than once between flushes (the bot rolling
several times in a row, say) is written just once, as its latest state. A
win is the one exception: it's always written through immediately, never
queued, and a graceful shutdown (`app.enableShutdownHooks()`) flushes
whatever's left in the queue so a normal restart never drops it.

**WAL mode** (`PRAGMA journal_mode=WAL`, set once at startup in
`PrismaService`) changes how SQLite itself writes to disk:

- **Concurrent reads and writes.** Readers no longer block a writer, and a
  writer no longer blocks readers — a request reading a game's state can
  proceed even while the batched flush above is mid-transaction.
- **Faster writes.** A write is a cheap sequential append to a `*-wal` log
  file first, checkpointed into the main database file lazily later,
  instead of an in-place update of the main file on every commit.
- **Crash safety.** If the process or the machine goes down mid-write,
  nothing is corrupted — SQLite replays the WAL log the next time the
  database is opened.

## Leaderboard pagination

`GET /leaderboard?limit=&offset=` (both optional, default `limit=10`,
`offset=0`, `limit` capped at 100) returns:

```json
{
  "data": [ /* UserProfile[], this page */ ],
  "meta": { "limit": 10, "total": 42 }
}
```

`total` is the size of the *whole* leaderboard, not just this page — a
client uses it to know whether there's more to fetch.

Under the hood, the entire leaderboard (every user, sorted by wins) is
what's fetched and cached under one Redis key — `limit`/`offset` just
slice that array afterwards, in memory, in `UsersService`. This is a
deliberate trade-off (see ARCHITECTURE.md §9 for the full reasoning):
pushing pagination into the SQL query itself (`skip`/`take` + a separate
`count()`) would keep every individual query bounded no matter how many
users exist, but a win can change any player's rank and therefore the
contents of *every* page — so every `(limit, offset)` combination would
need its own cache entry, and invalidating a win would mean invalidating
all of them, which the current `ICache` port (get/set/del by exact key)
can't do. Caching the whole sorted list once keeps invalidation exactly
as simple as it already was — one key, cleared on every win — at the cost
of that cached list growing with the total player count instead of the
page size. Fine at this project's scale; the thing to revisit if the
player base ever gets large enough for that to matter.

The cache's TTL is configurable via the optional `LEADERBOARD_TTL_SECONDS`
environment variable (see `.env.example`) — it defaults to 15 seconds if
unset. A short TTL keeps the leaderboard reasonably fresh between wins
even without invalidation catching every edge case; raise it if 15s is
too aggressive for manual testing (it's easy to have the key expire
between making a request and checking Redis by hand).

## Testing

Four layers, matching ARCHITECTURE.md §13:

- **Domain unit tests** (`test/domain/*.spec.ts`) — pure functions, no
  mocks needed, no NestJS/DB involved at all.
- **Application unit tests** (`test/application/*.spec.ts`) — each
  service (`AuthService`, `UsersService`, `GamesService`) tested against
  in-memory fake adapters (`test/mocks/*`: `FakeGameRepository`,
  `FakeUserRepository`, `FakeCache`, `FakeAuthProvider`, `FakeGameWriteBuffer`)
  instead of real Prisma/Redis/JWT. These assert behaviour that's easy to
  get wrong silently — e.g. that a non-bust roll only touches the cache,
  that a bust/ordinary-hold turn boundary is *queued* rather than written
  through, that a win always writes through immediately instead and is
  never left in the queue, and that the cache-unavailable fallback still
  writes through on every roll.
- **Infrastructure unit test** (`test/infrastructure/batched-game-write-buffer.spec.ts`)
  — the one adapter with real logic of its own (coalescing repeated writes
  to the same game, retrying a failed flush without losing data, not
  clobbering a fresher state with a stale retry), tested directly against
  a fake `IGameRepository` rather than trusted by inference.
- **E2E tests** (`test/e2e/*.e2e-spec.ts`) — `supertest` against a fully
  booted Nest app (real SQLite test DB via Prisma, mock auth provider),
  covering `/health`, the auth/login flow, and a full game played to
  completion over HTTP.

Run the unit tests (domain + application + infrastructure, no DB needed):

```bash
npm test
```

Run the e2e tests (needs a test SQLite DB pushed first — the `pretest:e2e`
script does this automatically):

```bash
npm run test:e2e
```

`test/e2e/setup-env.ts` points `DATABASE_URL` at `backend-api/test/e2e/test.db`
so it never touches your dev database; delete that file to start clean.

## Try it with curl or Postman

```bash
TOKEN_A=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"username":"edmund"}' | jq -r .token)
USER_A=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"username":"edmund"}' | jq -r .userId)
TOKEN_B=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"username":"charlotte"}' | jq -r .token)
USER_B=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' -d '{"username":"charlotte"}' | jq -r .userId)

GAME=$(curl -s -X POST localhost:3000/games -H "Authorization: Bearer $TOKEN_A" -H 'Content-Type: application/json' -d "{\"opponentUserId\":\"$USER_B\",\"winningScore\":50}" | jq -r .id)

curl -s -X POST localhost:3000/games/$GAME/roll -H "Authorization: Bearer $TOKEN_A" | jq
curl -s -X POST localhost:3000/games/$GAME/hold -H "Authorization: Bearer $TOKEN_A" | jq
curl -s localhost:3000/health/ready | jq
```

## Docker

```bash
docker compose up --build
```

Runs the API + Redis together; SQLite file persists on a named volume.

## What's deliberately not here yet

`packages/shared` (DTO types shared with the frontend) is introduced when
`frontend` is scaffolded next — see ARCHITECTURE.md §4 for why that wasn't
built prematurely.
