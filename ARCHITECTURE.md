# Gentleman's Wager — Architecture & Decisions

Status: **Design finalized, pending approval to start scaffolding.** No implementation code has been written yet.

## 1. Goal

Implement the dice game specified in `roeto-home-assignment.pdf`, branded **Gentleman's Wager** (a Victorian gentleman's-club framing for a custom push-your-luck dice game — not a 1:1 copy of the classic "Pig" or "Farkle" variants found online):

- 2 players, turn-based rounds.
- On a turn, a player rolls 2 dice as many times as they want; each roll adds to the round score.
- Rolling 6 & 6 loses the round score; turn passes.
- Holding commits the round score to the player's global score and passes the turn.
- First player to reach the winning score (default 100, configurable) wins.
- A player can start a new game at any time.
- **All game logic lives in the backend API.** The React frontend only displays state and calls the API (roll, hold, new game) — it contains zero game rules.
- Only authenticated users can create/play games.
- Multiple players are simulated on a single browser tab/page (no live cross-browser sync required).

## 2. Architecture Principles Applied

| Principle | How it's applied here |
|---|---|
| Separation of Concerns | Domain (game rules) / Application (use-cases) / Infrastructure (DB, cache, auth) / API (HTTP) are separate layers. Frontend never touches game rules. |
| KISS | No microservices, no message queues, no bespoke ORM. Single NestJS monolith, single SQLite file. Heavy infra (full metrics stack, k8s manifests, real SSO) explicitly deferred — see §11. |
| Modularity | NestJS feature modules (Auth, Users, Games, Cache, Health) with clear boundaries and DI-based wiring. |
| Abstraction | Game engine, persistence, cache, and auth are all accessed through interfaces ("ports"); concrete tech (Prisma, Redis, mock-auth) are swappable "adapters" behind them. |
| Trade-offs | Every non-trivial decision below states what we gained and what we consciously gave up. |
| Testability | The domain (`GameEngine`) is pure TypeScript with zero framework/DB/network imports — testable with plain unit tests, no mocks needed. |
| Protect business logic from frameworks | `domain/` has no imports from NestJS, Prisma, or Redis. Only `infrastructure/` depends on those. |

## 3. Tech Stack (decided)

- **Backend:** NestJS + TypeScript (chosen over plain Express for built-in DI/module structure, and over FastAPI to keep one language across the stack and share types with the frontend).
- **Frontend:** React + TypeScript + Vite.
- **Database:** SQLite via Prisma ORM, WAL journal mode enabled for concurrent read/write.
- **Cache:** Redis (cache-aside for leaderboard, write-behind-style cache for in-flight game state).
- **Auth:** Simplified/mock provider now (username only, no password), but with real JWT issuance and validation — swappable for OAuth2/SSO later without touching consumers.
- **Containerization:** Docker + docker-compose (api, web, redis services; SQLite file on a volume).
- **Frontend theme:** Victorian gentleman's-club visual theme — deep green baize, brass/gold, dark wood — isolated as a theming layer.

## 4. Monorepo Structure

```
/backend-api      NestJS backend
/frontend         React + Vite frontend
```

Flat, hyphenated top-level folders (`backend-api`, `frontend`) rather than
nested `apps/*` — matches how the project is actually laid out on disk.
Each is a fully standalone npm project (its own `package.json`,
`node_modules`) — there is no `packages/shared` workspace. That was the
original plan sketched here (a shared TS types package for the API
contract), but it's deliberately not built: a root `package.json` with
npm workspaces earlier in development caused a stray `node_modules` to
reappear at the repo root purely from dependency hoisting, confusing
enough that it was removed entirely rather than revived. `frontend/src/types/`
instead holds a small hand-written copy of the types it actually uses,
checked directly against `backend-api`'s domain entities and
controllers — more duplication in principle, in exchange for zero
cross-project tooling coupling, which matters more at this project's
size than DRY-ness across a request/response boundary that rarely
changes.

### `backend-api/src` layout (Ports & Adapters / Hexagonal-lite)

```
domain/            Pure game rules & entities. No imports from Nest/Prisma/Redis.
  game-engine.ts   Pure functions/class: roll(state), hold(state), isBust(), checkWin()
  entities.ts      GameState, Player, etc. (plain TS types)
  ports/           Repository & service INTERFACES only (no implementation)
    game-repository.port.ts
    game-write-buffer.port.ts
    user-repository.port.ts
    cache.port.ts
    auth-provider.port.ts
    dice-roller.port.ts

application/       Use-case services orchestrating domain + ports
  games.service.ts
  users.service.ts
  auth.service.ts

infrastructure/    Concrete adapters implementing the ports above
  persistence/prisma/   PrismaGameRepository, PrismaUserRepository
  persistence/          BatchedGameWriteBuffer (implements game-write-buffer.port; §8.3)
  cache/redis/          RedisCache (implements cache.port)
  auth/mock/            MockAuthProvider (implements auth-provider.port)
  dice/                 GracefulDiceRollerAdapter (implements dice-roller.port)

modules/           NestJS wiring: controllers, DI bindings (port → adapter), guards
  auth.module.ts
  users.module.ts
  games.module.ts
  cache.module.ts
  health.module.ts

common/            Rate-limit guard, exception filters, DTO validation
```

Nothing in `domain/` or `application/` imports from `infrastructure/` directly — only interfaces (`ports/`). NestJS modules bind an interface token to a concrete adapter at wiring time, e.g. `{ provide: GAME_REPOSITORY, useClass: PrismaGameRepository }`. Swapping SQLite→Aurora Postgres (via Prisma) needs only an env var + Prisma `provider` change. Swapping away from Prisma entirely (e.g. Aurora Data API, a different ORM) needs only a new adapter class — zero changes to domain, application, or controllers.

### `frontend/src` layout

```
types/          Hand-written interfaces mirroring backend-api's DTOs
                (checked against domain/entities.ts and the controllers)
api/            client.ts (fetch wrapper: base URL, JWT, error
                normalization) plus one <resource>.ts (raw fetch calls)
                and one use<Resource>.ts (React Query wrapper) per
                backend resource — auth, games, users
theme/          GlobalStyles.styles.ts — the one file with actual
                color/spacing/font values, as CSS custom properties;
                every other styled component reads them via var(--...)
context/        PlayersContext — holds both players' sessions at once
                (see "Two players, one page" in frontend/README.md) and
                resolves which one owns the current turn
components/     Small reusable pieces (dice/, game/, leaderboard/,
                auth/, common/), each with its own <Name>.styles.ts
                (styled-components) beside it
screens/        LoginScreen, GameScreen, LeaderboardScreen — compose
                components, own the data-fetching for their view
```

No game logic lives here at all — every screen only calls
`backend-api`'s endpoints and renders whatever state comes back, per the
assignment brief ("No game logic should live in the frontend").

## 5. Domain Model & Game Rules (precise semantics)

State per game: `players[2]`, `scores[2]` (committed/global scores), `currentPlayerIndex`, `roundScore` (uncommitted, current turn only), `winningScore`, `status` (`IN_PROGRESS` | `FINISHED`), `winnerId`.

- **Roll:** only valid if it's the caller's turn and game is `IN_PROGRESS`. Roll 2 dice.
  - If dice ≠ (6,6): add sum to `roundScore`. Game continues, same player's turn.
  - If dice = (6,6): `roundScore` resets to 0, turn passes to the other player.
- **Hold:** only valid if it's the caller's turn and game is `IN_PROGRESS`.
  - `scores[currentPlayer] += roundScore`; `roundScore` resets to 0.
  - **Win check happens here, and only here** — not after every roll, not on bust. If `scores[currentPlayer] >= winningScore`, game becomes `FINISHED` and `winnerId` is set; otherwise turn passes to the other player.
- **New Game:** creates a fresh `Game` row/state; can be called any time regardless of current game status.
- **Authorization vs. domain validation (kept separate):** "Is this JWT user allowed to act" (does caller's user id match `currentPlayerIndex`) is an application-layer authorization check. "Is this move legal" (game not finished, no double actions) is a domain rule. Neither layer duplicates the other's job.

## 6. API Contract (conceptual — types live in `packages/shared`)

| Method & Path | Auth | Description |
|---|---|---|
| `POST /auth/login` | none | `{ username }` → `{ token, userId, username }`. Mock provider: creates the user on first login. |
| `GET /users/me` | required | Current user profile + `wins` count. |
| `GET /leaderboard` | required | Top players by wins, served from Redis cache-aside (short TTL). |
| `POST /games` | required | `{ opponentUserId, winningScore? }` → new game state. Caller becomes player 1. |
| `GET /games/:id` | required, participant only | Current game state. |
| `POST /games/:id/roll` | required, must be current-turn player | Rolls 2 dice server-side → `{ diceA, diceB, busted, state }`. |
| `POST /games/:id/hold` | required, must be current-turn player | Commits round score → updated state (may include win). |
| `POST /games/:id/new` | required, participant | Starts a fresh game (rematch). |
| `GET /health/live` | none | Liveness probe (process up). |
| `GET /health/ready` | none | Readiness probe (DB + Redis reachable). k8s-compatible; no k8s manifests written (out of scope, see §11). |

## 7. Data Model (Prisma schema, conceptual)

```
User {
  id         String  @id
  username   String  @unique
  wins       Int     @default(0)
  avatarId   Int?
  createdAt  DateTime @default(now())
}

Game {
  id                String   @id
  player1Id         String
  player2Id         String
  winningScore      Int      @default(100)
  status            String   // "IN_PROGRESS" | "FINISHED"
  winnerId          String?
  currentPlayerId   String
  score1            Int      @default(0)
  score2            Int      @default(0)
  roundScore        Int      @default(0)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

## 8. Persistence Strategy — minimizing DB writes

Goal: reduce write volume without risking data that actually matters.

1. **Event-driven, not time-driven, as the primary lever.** Individual rolls within a turn touch **Redis only** (ephemeral round state) — zero SQLite writes while a player is just rolling. SQLite is written only at turn boundaries: **Hold** or **Bust**. This alone cuts DB writes from "per roll" to "per turn." If the process crashes mid-round, only not-yet-committed rolls are lost — semantically equivalent to an interrupted turn, not a data-integrity issue.
2. **Immediate (synchronous) write on Win.** The single most valuable event in a game is never left to a timer — `GamesService` always calls `IGameRepository.save()` directly for a win, never the batched path below.
3. **Secondary layer: periodic batched flush.** An ordinary Hold or a Bust (already "committed" in the cache, but not yet durable in SQLite) is queued instead of written through — `IGameWriteBuffer` (`domain/ports/game-write-buffer.port.ts`), implemented by `BatchedGameWriteBuffer` (`infrastructure/persistence/batched-game-write-buffer.ts`). Every ~4s it writes everything queued in one `IGameRepository.saveMany()` — one `prisma.$transaction([...])` covering all games that changed. A game queued more than once between flushes (e.g. the bot rolling repeatedly) is written just once, as its latest state. Most useful once many concurrent games exist; negligible effect for a single demo game, but the pattern is implemented and unit-tested (`test/infrastructure/batched-game-write-buffer.spec.ts`) — including a failed flush re-queuing its batch for the next attempt instead of losing it, without clobbering a fresher state enqueued while that flush was in flight.
   - **Correctness detail:** whenever `GamesService` writes a game through immediately instead (a win, or the no-cache fallback below), it also calls `IGameWriteBuffer.discard(gameId)`. Without this, an older queued state from an earlier turn boundary in the same game could flush *after* the fresher immediate write and silently overwrite it.
4. **Flush on graceful shutdown.** `main.ts` calls `app.enableShutdownHooks()`; `BatchedGameWriteBuffer.onModuleDestroy()` stops the timer and does one final `flush()`, so a normal restart/redeploy (SIGTERM) never drops the last queued batch — only an unclean crash can, and only for the ~4s window described above.
5. **WAL mode.** `PrismaService.onModuleInit()` runs `PRAGMA journal_mode=WAL;` once at startup (idempotent — it's recorded in the SQLite file itself, not a per-connection setting). Readers and writers stop blocking each other, and a write becomes a cheap sequential append to a `*-wal` log rather than an in-place update of the main file — which is also what keeps §8.3's batched transaction from stalling concurrent reads. If the process or the machine dies mid-write, SQLite replays the WAL log on the next open and the database is never left corrupt.
6. **Honest calibration:** SQLite is in-process (no network hop), so batching does not save network latency the way it would for a remote DB. The real win is fewer write-transactions/fsyncs under concurrent writes. If migrating to a networked DB (e.g. Aurora Postgres) later, the same batching pattern would additionally cut round-trip cost — the repository abstraction in §4 makes that migration a contained change.

## 9. Caching Strategy (Redis)

- **Source of truth is always SQLite, never Redis.** Redis is cache-aside (leaderboard) and a write-behind buffer for in-flight game state — never the only copy of committed data.
- **Graceful degradation:** if Redis is unreachable, the app must keep working (reads/writes fall through to SQLite directly), just without the speed-up. This is enforced by hiding Redis behind an `ICache` port with a no-op-safe contract.
- Leaderboard cache invalidated (or short TTL) on win events.
- **Leaderboard pagination (`GET /leaderboard?limit=&offset=`).** `IUserRepository.getLeaderboard()` returns every user, sorted by wins descending — no `limit` at the repository level. `UsersService` is what's cached (one key, the same `'leaderboard'` key as before) and paginated: the *entire* sorted list is fetched once (or served from cache) and then sliced with `.slice(offset, offset + limit)` in memory. The response is `{ data: UserProfile[], meta: { limit, total } }`, where `total` is the size of the whole leaderboard, not just the returned page.
  - **Trade-off, chosen deliberately:** pagination could instead be pushed into the query itself (`skip`/`take` in Prisma, plus a separate `count()` for `total`) so the database never returns more than one page's worth of rows regardless of how many users exist. That approach is more correct at scale, but it breaks the current invalidation model — winning changes rank, which can shift *every* page's contents, so every distinct `(limit, offset)` combination would need its own cache entry, and a win would have to invalidate all of them (Redis pattern delete, or a registry of active keys — `ICache` doesn't support that today). Caching the whole sorted list and slicing it afterwards keeps invalidation exactly as simple as it already was (one key, `cache.del()` on every win) at the cost of the cached list — and the one query behind it — growing with the total number of players rather than staying bounded by the page size. Accepted here because this project's user count is small; if it ever grew into the range where holding every user in memory/cache became the actual bottleneck, that's the point to switch to DB-level `skip`/`take` and give `ICache` a way to invalidate a key pattern, not before.

## 9a. Dice Source: rpg-dice-roller, with a graceful-degradation fallback

- `Math.random()`-based dice (`1 + Math.floor(Math.random() * 6)`) is statistically uniform, but the domain of this app is dice — so rolls now go through **`@dice-roller/rpg-dice-roller`**, a purpose-built, independently-tested dice engine, instead of hand-rolled arithmetic. This is primarily an architectural choice (delegate RNG correctness to a library that's already had that scrutiny applied, rather than reason about it from scratch) — its default engine (`nativeMath`) is `Math.random` under the hood too, so picking the library alone changes nothing about randomness quality.
- **RNG engine explicitly set to Node's crypto engine** (`NumberGenerator.generator.engine = NumberGenerator.engines.nodeCrypto`, set once at module load in `rpg-dice-roller.adapter.ts`). This is what actually changes the randomness: `Math.random` is not cryptographically secure — its internal state can in principle be reconstructed from enough prior outputs (published research exists on reversing V8's PRNG) — which matters, even if narrowly, for a game explicitly branded around a wager. Verified with a live `node -e` smoke test against the installed package (not just a type-check): rolling and reading `.total` both work with the crypto engine active.
- Same shape as the Redis decision in §9: hidden behind a port (`IDiceRoller` / `DICE_ROLLER`), never called directly by the domain or application layer.
- `GracefulDiceRollerAdapter` tries the library first; if it throws (bad output shape, a future breaking version) or misbehaves, it logs a warning and falls back to `MathRandomDiceRollerAdapter` — the same `rollTwoDice()` used before. A problem in this dependency degrades the game (silently back to plain `Math.random`), it never crashes it.
- **Testability:** application-layer tests use `FakeDiceRoller` + `jest.spyOn(dice, 'roll').mockReturnValueOnce([a, b])` — spying on a real method of a real object, replacing the earlier approach of mocking global `Math.random` and reverse-engineering the floats that would produce a given face.
- Domain layer is untouched: `game-engine.ts`'s `roll()` still just takes a `DiceRoller = () => [number, number]` function; the application layer adapts `IDiceRoller.roll()` to it with `() => this.dice.roll()`. The domain still doesn't know this port, or any concrete RNG, exists.

## 9b. Computer Opponent

- The "bot" is a real, seeded `User` row (`isBot: true`, username `AI` — see `prisma/seed.ts`, run via `npx prisma db seed`) rather than a hardcoded sentinel id — `Game.player1Id`/`player2Id` are real foreign keys, so it has to be a real user for the schema to stay honest. The seed upserts by the `isBot` flag rather than by username, so renaming the bot later (as happened once — it started out as `croupier`) updates that one row instead of leaving an orphaned duplicate behind. `GET /users/bot` exposes its id; game creation itself has no separate "vs bot" code path — it's `POST /games { opponentUserId: <bot id> }` like any other game.
- Strategy is a pure function, `domain/bot-policy.ts` — a fixed round-score threshold (hold at 20, or earlier if holding now would already win), the classic push-your-luck heuristic. No I/O, no framework, unit-tested standalone like the rest of `domain/`.
- The bot's turn advances **one action per API call** (`POST /games/:id/bot-turn`) rather than resolving instantly — the frontend calls it repeatedly (with a short delay) so the bot's rolls animate like a real opponent's, instead of the game jumping straight to a final result.
- `GamesService.applyRoll`/`applyHold` are shared between the human-facing `roll()`/`hold()` and the bot's `botTurn()` — identical persistence/cache/win-crediting logic either way, no duplicated rules.

## 10. Auth Strategy

- Current implementation: `POST /auth/login { username }` issues a real, signed JWT — no password check (per assignment's "simulate different users on the same page" spirit, and to avoid over-scoping a toy assignment with credential management).
- Hidden behind `IAuthProvider`; NestJS guards depend on the interface, not the concrete provider. Swapping to real password auth or OAuth2/SSO later = new adapter, zero changes to guards/controllers.
- Satisfies the assignment's "only authenticated users can create/play games" requirement: every game/action endpoint is guarded by a real token check, even though the login step itself is simplified.

## 11. Cross-Cutting Concerns

- **Rate limiting:** `@nestjs/throttler` guard on `/auth/*` and `/games/*` endpoints.
- **Health checks:** `/health/live`, `/health/ready` — designed to be k8s-probe-compatible. We are **not** writing Kubernetes manifests/deployment configs for this assignment; the endpoints exist so they could be wired into one trivially later.
- **Docker:** `docker-compose.yml` with `api`, `web`, `redis` services; SQLite file on a named volume. One-command local spin-up.

## 12. Frontend Architecture

- Layers: `api/` (typed HTTP client, one function per endpoint, uses shared DTOs) → `auth/` (holds multiple "logged in" identities at once, since players are simulated on one page — a simple switcher, no game logic) → `features/game/useGame` hook (calls API, mirrors the response into local state — computes nothing itself) → presentational components (`DiceView`, `ScoreBoard`, `TurnBanner`, `GameControls`, `BustAnimation`).
- **Hard rule:** no component or hook derives game outcomes client-side. Every state transition comes from an API response.
- **Theming:** Victorian gentleman's-club visual theme (green baize, brass/gold accents, dark wood tones) implemented as a separate CSS-variables/token layer, decoupled from component logic — the theme can be swapped without touching any component.

## 13. Testing Strategy

- **Domain (`GameEngine`):** plain unit tests, no mocks — roll accumulation, bust on 6&6, hold transferring score/turn, win detection exactly at/above threshold, custom winning score, rejecting actions when game is finished.
- **Application services:** unit-tested against in-memory fake implementations of the repository/cache ports — no real DB/Redis needed.
- **Infrastructure (the one exception worth its own tests):** `BatchedGameWriteBuffer` (§8.3) has real logic of its own — coalescing repeated writes to the same game, retrying a failed flush without losing data, not clobbering a fresher state with a stale retry — so it gets a direct unit test (`test/infrastructure/batched-game-write-buffer.spec.ts`) against a fake `IGameRepository`, instead of being trusted by inference from GamesService's tests (which only ever exercise `FakeGameWriteBuffer`, a plain in-memory stub with none of that logic).
- **API layer:** integration tests (e.g. supertest) covering auth guards, turn-ownership validation, and full game flow end-to-end against a test SQLite DB.

## 14. In Scope — Extras Being Built

- Win counter per player + `/leaderboard` endpoint.
- Static avatar selection (no upload pipeline).
- 6&6 bust: brief action lock + message/animation on the frontend.
- Rate limiting.
- Health check endpoints (k8s-probe-shaped).
- Redis caching layer with graceful degradation.
- Docker + docker-compose packaging.
- Swappable `IAuthProvider` interface (mock implementation now).
- Victorian gentleman's-club UI theme.

## 15. Explicitly Deferred (documented as roadmap, not built)

These were considered and consciously excluded to avoid over-engineering a take-home assignment — each is a real production concern, but none solves an actual problem at this project's scale (single demo instance, ~1 concurrent user):

- Full metrics/observability stack (Prometheus/Grafana dashboards: API latency, error rate, DB CPU, container memory, Redis hit rate).
- Configurable data-retention policy for leaderboard/rating data.
- Real OAuth2/SSO integration (the interface supports adding it later without refactoring).
- Kubernetes deployment manifests (only the probe-compatible health endpoints are built).

**How this would evolve for real production traffic:** introduce the metrics stack once there's more than one instance to compare; add OAuth2/SSO when real user accounts (not simulated ones) are required; add k8s manifests once there's an actual multi-instance deployment target; revisit the retention policy once there's a real data-privacy/compliance requirement driving it.

## 16. Open Assumptions

- "Simulate different users on the same page" is implemented as: the frontend can hold multiple active JWT sessions in memory at once and lets the user pick which identity is "acting," rather than requiring separate browser profiles.
- A game is always between two already-registered users (login creates a user on first use); there is no anonymous "guest" player slot.
- Avatars are a fixed, pre-defined set shipped with the frontend — not user-uploaded images.
