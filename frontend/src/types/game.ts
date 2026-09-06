/** Mirrors backend-api's domain entities (src/domain/entities.ts) exactly — */
/** this frontend never computes game rules, only displays this shape.    */

export type GameStatus = 'IN_PROGRESS' | 'FINISHED';

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

export interface BotTurnResult {
  action: 'roll' | 'hold';
  /** Present only when action === 'roll'. */
  dice?: [number, number];
  /** Present only when action === 'roll'. */
  busted?: boolean;
  state: GameState;
}
