import { DEFAULT_WINNING_SCORE, GameState, RollOutcome } from './entities';
import { GameAlreadyFinishedError, NotYourTurnError } from './errors';

/**
 * The entire ruleset of Gentleman's Wager, as pure functions.
 *
 * No NestJS, no Prisma, no HTTP, no randomness that can't be swapped out —
 * this file is deliberately importable and testable with nothing but
 * plain Jest. See ARCHITECTURE.md section 5 for the rules this encodes.
 */

type DiceRoller = () => [number, number];

export function rollTwoDice(): [number, number] {
  const a = 1 + Math.floor(Math.random() * 6);
  const b = 1 + Math.floor(Math.random() * 6);
  return [a, b];
}

export function createGame(
  id: string,
  player1Id: string,
  player2Id: string,
  winningScore = DEFAULT_WINNING_SCORE,
): GameState {
  return {
    id,
    player1Id,
    player2Id,
    winningScore,
    status: 'IN_PROGRESS',
    winnerId: null,
    currentPlayerId: player1Id,
    score1: 0,
    score2: 0,
    roundScore: 0,
  };
}

function assertActionable(state: GameState, userId: string): void {
  if (state.status !== 'IN_PROGRESS') throw new GameAlreadyFinishedError();
  if (state.currentPlayerId !== userId) throw new NotYourTurnError();
}

function otherPlayer(state: GameState, userId: string): string {
  return userId === state.player1Id ? state.player2Id : state.player1Id;
}

/**
 * Roll two dice for the acting player.
 * - 6 & 6: the round score burns to zero and the turn passes immediately.
 * - anything else: the sum is added to the round score; the turn continues.
 *
 * `diceRoller` defaults to real randomness but can be overridden — this is
 * what makes the bust/no-bust branches deterministically testable.
 */
export function roll(state: GameState, userId: string, diceRoller: DiceRoller = rollTwoDice): RollOutcome {
  assertActionable(state, userId);
  const dice = diceRoller();
  const busted = dice[0] === 6 && dice[1] === 6;

  if (busted) {
    return {
      dice,
      busted: true,
      state: { ...state, roundScore: 0, currentPlayerId: otherPlayer(state, userId) },
    };
  }

  const sum = dice[0] + dice[1];
  return {
    dice,
    busted: false,
    state: { ...state, roundScore: state.roundScore + sum },
  };
}

/**
 * Bank the round score into the acting player's committed score and pass
 * the turn. Win is checked here, and only here — never mid-round.
 */
export function hold(state: GameState, userId: string): GameState {
  assertActionable(state, userId);
  const isPlayer1 = userId === state.player1Id;
  const committedScore = (isPlayer1 ? state.score1 : state.score2) + state.roundScore;
  const won = committedScore >= state.winningScore;

  return {
    ...state,
    score1: isPlayer1 ? committedScore : state.score1,
    score2: isPlayer1 ? state.score2 : committedScore,
    roundScore: 0,
    status: won ? 'FINISHED' : 'IN_PROGRESS',
    winnerId: won ? userId : null,
    currentPlayerId: won ? state.currentPlayerId : otherPlayer(state, userId),
  };
}
