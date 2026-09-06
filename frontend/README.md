# Gentleman's Wager — frontend

React + TypeScript (Vite) client for the Roeto home assignment. It has no
game logic of its own — it only calls `backend-api`'s endpoints and
displays whatever state comes back (see the assignment brief: "No game
logic should live in the frontend").

## Stack

- **Vite + React + TypeScript** — no router: the whole app is one page
  with a small top-level view switch (`App.tsx`), which is all a
  login → lobby → game → leaderboard flow needs.
- **styled-components** for styling — see "Theming" below.
- **TanStack Query** (`@tanstack/react-query`) for talking to the API —
  every entry point (`auth`, `games`, `users`) has a thin `api/<name>.ts`
  (plain `fetch` calls) plus a `api/use<Name>.ts` (the `useQuery`/
  `useMutation` wrapper around it), so loading/error/success state is
  handled consistently instead of hand-rolled per screen.
- **Vitest + React Testing Library** for tests.

## Running it

### With the rest of the stack (Docker)

From the repo root (`../docker-compose.yml` already includes this
service):

```bash
docker compose up --build
```

Frontend: `http://localhost:5173`. It's built as static files served by
nginx, with `VITE_API_BASE_URL` baked in at build time (build `ARG` in
`Dockerfile`, currently `http://localhost:3000` — the browser calls the
API's host-mapped port directly, not the Docker-internal service name).

### Standalone, for active development

```bash
npm install
cp .env.example .env      # VITE_API_BASE_URL, defaults to http://localhost:3000
npm run dev
```

Needs `backend-api` (and Redis) running separately — either
`docker compose up api redis` from the repo root, or `npm run start:dev`
in `backend-api/`.

## Scripts

- `npm run dev` — Vite dev server with HMR.
- `npm run build` — type-checks (`tsc -b`) then builds to `dist/`.
- `npm run preview` — serves the production build locally.
- `npm run test` / `npm run test:watch` — Vitest.
- `npm run dev:ssr` / `npm run build:ssr` — same as `dev`/`build`, but with
  the styled-components `ssr` babel option turned on. See "Styled-components
  debug names" below — this app doesn't actually do server-rendering, these
  exist to demonstrate the toggle.

## Styled-components debug names

Every styled component (`styled.div`, etc.) renders two CSS classes, e.g.
`sc-hiCkpJ dmJoJw`: a stable per-component id, and a hash of its actual
generated CSS (so two components that end up with identical styles share
the second class). Neither carries the name of the variable you gave the
component — styled-components doesn't have access to that at runtime.

`babel-plugin-styled-components` (wired into `vite.config.ts` via
`@vitejs/plugin-react`'s `babel` option) adds that back in `displayName` +
`fileName` mode: classes and React DevTools component names show up as
e.g. `Shell-sc-hiCkpJ-1` instead of a bare hash, which makes inspecting the
DOM and the component tree far more readable. Requires
`babel-plugin-styled-components` as a dev dependency
(`npm install --save-dev babel-plugin-styled-components`).

The plugin also has an `ssr` option (default `true` upstream), which adds
a unique id to every styled component so client and server generate the
same class names during hydration — needed only when the same app is
literally rendered on both a server and the browser. This project has no
server-rendering step (it's a static SPA served by nginx in Docker, or
Vite's dev server locally), so `ssr` would just be dead weight; `npm run
dev`/`npm run build` set it to `false`. The `:ssr` script variants
(`npm run dev:ssr` / `npm run build:ssr`, driven by Vite's `--mode ssr`)
flip it back on, kept around so the toggle is there and documented if this
ever grows an actual SSR setup, rather than because this app needs it
today.

## Folder structure

```
src/
  types/        Hand-written interfaces mirroring backend-api's DTOs
                (checked directly against src/domain/entities.ts and the
                controllers, not guessed) — kept here rather than a
                shared npm workspace package, deliberately: see
                "Why no shared types package" below.
  api/
    client.ts               fetch wrapper: base URL, JWT header, error
                             normalization into ApiError
    auth.ts / games.ts / users.ts       one file per backend resource,
                             each just the raw typed fetch calls
    useAuth.ts / useGames.ts / useUsers.ts   the React Query wrapper for
                             each of the above — one response-handling
                             file per entry point
  theme/
    GlobalStyles.styles.ts  the ONE file with actual color/spacing/font
                             values (as CSS custom properties) — every
                             other styled component reads them via
                             var(--...), never a literal
  context/
    PlayersContext.tsx      holds both players' sessions at once (see
                             "Two players, one page" below) and resolves
                             which one owns the current turn
  components/    Small, reusable pieces — dice/, game/, leaderboard/,
                 auth/, common/ (shared Button/Card primitives) — each
                 with its own <Name>.styles.ts next to it
  screens/       LoginScreen, GameScreen, LeaderboardScreen — compose
                 components, own the data-fetching for their view
  App.tsx        top-level view switch + providers (QueryClientProvider,
                 PlayersProvider, GlobalStyles)
```

## Two players, one page

The assignment brief is explicit: *"simulate the different users on the
same page. No need for live updates between different browsers/machine."*
So there's no second browser tab or WebSocket sync — `PlayersContext`
just holds up to two logged-in sessions (JWT + userId + username) in
memory at once, and `GameScreen` picks whichever session's token matches
the game's `currentPlayerId` before signing the next `roll`/`hold`
request. If neither session matches, it's the seeded computer opponent's
turn, and `GameScreen` drives it automatically via `POST /games/:id/bot-turn`
(one step per call, with a short delay between calls so its moves are
visible rather than instant).

## Theming

Every actual color/spacing/font value lives in one place —
`theme/GlobalStyles.styles.ts`'s `:root` block — as CSS custom
properties. Every styled component (in `<Name>.styles.ts` files
throughout the app) reads them via `var(--color-gold)` etc., never a
literal. Re-theming the app means editing that one file; nothing else
needs to change. The palette itself comes from `../assets/logo.png`
(black top hat, gold/bronze band, ivory dice, one red pip).

## Why no shared types package

`ARCHITECTURE.md` §6 in the repo root conceptually anticipated a
`packages/shared` npm workspace for API types. This project deliberately
does *not* revive that: earlier in development a root `package.json` with
npm workspaces caused a stray `node_modules` to reappear at the repo
root, which was confusing enough to remove entirely. `frontend/` is a
fully standalone npm project instead, with its own small hand-written
copy of the types it actually uses (checked against the real backend
source, see `types/`) — more duplication in principle, but zero
cross-project tooling coupling, which matters more at this project's
size.

## Tests

`npm run test` covers: `api/client.ts`'s error normalization (server
message extraction, validation-array joining, network-failure wrapping),
`LoginForm` (submit/error/blank-username paths), `GameControls` and
`PaginationControls` (disabled states, click handlers). Not exhaustive —
the assignment's game-rules correctness is already fully covered on the
backend (`backend-api/test/`), and this frontend never re-implements any
of those rules to test.
