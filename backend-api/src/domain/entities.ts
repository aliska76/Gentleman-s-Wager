type GameStatus = 'IN_PROGRESS' | 'FINISHED';

/** Used when a caller doesn't specify a winning score — see game-engine.ts's createGame and GamesService.createGame. */
export const DEFAULT_WINNING_SCORE = 100;

/**
 * The full state of one game. This is the only shape the domain engine
 * knows about — no Prisma row, no HTTP DTO, no framework type ever
 * crosses into this file's territory.
 */
export interface GameState {
  id: string;
  player1Id: string;
  player2Id: string;
  winningScore: number;
  status: GameStatus;
  winnerId: string | null;
  currentPlayerId: string;
  /** Committed, permanent score. */
  score1: number;
  /** Committed, permanent score. */
  score2: number;
  /** Uncommitted score accumulated during the current turn — at risk until Hold. */
  roundScore: number;
}

export interface RollOutcome {
  dice: [number, number];
  busted: boolean;
  state: GameState;
}

export interface UserProfile {
  id: string;
  username: string;
  wins: number;
  avatarId: number;
  /** True for the single seeded "house" opponent (see domain/bot-policy.ts). */
  isBot: boolean;
}

export interface BotTurnResult {
  action: 'roll' | 'hold';
  /** Present only when action === 'roll'. */
  dice?: [number, number];
  /** Present only when action === 'roll'. */
  busted?: boolean;
  state: GameState;
}

/**
 * Shared envelope for any endpoint that returns a page of a larger
 * collection, so a paginated response always has the same shape no
 * matter which endpoint it comes from. `total` is the size of the whole
 * collection (not just this page) — a client uses it to know whether
 * there's more to fetch.
 */
interface PaginationMeta {
  limit: number;
  total: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
