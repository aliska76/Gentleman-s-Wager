import { GameState } from './entities';

export const DEFAULT_BOT_HOLD_THRESHOLD = 20;

export interface BotDecision {
  action: 'roll' | 'hold';
}

/**
 * The computer opponent's strategy. Pure function, no I/O, no randomness
 * of its own — it only looks at the state that already exists and picks
 * an action. Deliberately simple (a fixed round-score threshold, the
 * classic "hold at 20" push-your-luck heuristic) rather than a fully
 * optimal solver: good enough to feel like a real opponent, easy to
 * explain, and the threshold is a single constant if it ever needs
 * tuning or per-difficulty variants later.
 *
 * Two conditions to hold, checked in order:
 * 1. Holding now would already win the game — always take a sure win
 *    over the risk of busting away the whole round.
 * 2. The round score has reached the threshold — banking a good round
 *    rather than pushing further into bust risk.
 * Otherwise: roll again. Note the round score is always 0 at the start
 * of the bot's turn (see game-engine.ts hold()/roll() — both reset it),
 * so neither condition fires before the bot has rolled at least once.
 */
export function decideBotMove(
  state: GameState,
  botUserId: string,
  holdThreshold: number = DEFAULT_BOT_HOLD_THRESHOLD,
): BotDecision {
  const isPlayer1 = botUserId === state.player1Id;
  const committedScore = isPlayer1 ? state.score1 : state.score2;
  const projectedScore = committedScore + state.roundScore;

  if (projectedScore >= state.winningScore) {
    return { action: 'hold' };
  }
  if (state.roundScore >= holdThreshold) {
    return { action: 'hold' };
  }
  return { action: 'roll' };
}
