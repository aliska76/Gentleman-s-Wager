import { createGame, hold, roll } from '../../src/domain/game-engine';
import { GameAlreadyFinishedError, NotYourTurnError } from '../../src/domain/errors';

describe('game-engine', () => {
  const P1 = 'player-1';
  const P2 = 'player-2';

  it('starts a fresh game at zero with player 1 to act', () => {
    const state = createGame('g1', P1, P2, 100);
    expect(state.score1).toBe(0);
    expect(state.score2).toBe(0);
    expect(state.roundScore).toBe(0);
    expect(state.currentPlayerId).toBe(P1);
    expect(state.status).toBe('IN_PROGRESS');
  });

  it('accumulates the round score on a non-bust roll and keeps the turn', () => {
    const state = createGame('g1', P1, P2, 100);
    const outcome = roll(state, P1, () => [3, 4]);
    expect(outcome.busted).toBe(false);
    expect(outcome.state.roundScore).toBe(7);
    expect(outcome.state.currentPlayerId).toBe(P1);
  });

  it('burns the round score and passes the turn on double six', () => {
    let state = createGame('g1', P1, P2, 100);
    state = roll(state, P1, () => [5, 5]).state; // roundScore = 10
    const outcome = roll(state, P1, () => [6, 6]);
    expect(outcome.busted).toBe(true);
    expect(outcome.state.roundScore).toBe(0);
    expect(outcome.state.currentPlayerId).toBe(P2);
    expect(outcome.state.score1).toBe(0); // nothing was ever committed
  });

  it('commits the round score to the global score on hold and passes the turn', () => {
    let state = createGame('g1', P1, P2, 100);
    state = roll(state, P1, () => [4, 3]).state; // roundScore = 7
    const after = hold(state, P1);
    expect(after.score1).toBe(7);
    expect(after.roundScore).toBe(0);
    expect(after.currentPlayerId).toBe(P2);
    expect(after.status).toBe('IN_PROGRESS');
  });

  it('only checks for a win at hold, never mid-round', () => {
    let state = createGame('g1', P1, P2, 10);
    state = roll(state, P1, () => [6, 5]).state; // roundScore = 11, already past the threshold — but not banked
    expect(state.status).toBe('IN_PROGRESS');

    const busted = roll(state, P1, () => [6, 6]); // burns it before it was ever committed
    expect(busted.state.status).toBe('IN_PROGRESS');
    expect(busted.state.score1).toBe(0);
  });

  it('declares a winner exactly when the committed score reaches the winning threshold', () => {
    let state = createGame('g1', P1, P2, 10);
    state = roll(state, P1, () => [5, 4]).state; // roundScore = 9
    let after = hold(state, P1);
    expect(after.status).toBe('IN_PROGRESS'); // 9 < 10, not yet

    after = { ...after, currentPlayerId: P1 }; // it becomes P1's turn again
    const rolled = roll(after, P1, () => [1, 1]).state; // roundScore = 2, would total 11
    const finished = hold(rolled, P1);
    expect(finished.status).toBe('FINISHED');
    expect(finished.winnerId).toBe(P1);
    expect(finished.score1).toBe(11);
  });

  it('respects a custom winning score', () => {
    const state = createGame('g1', P1, P2, 5);
    const rolled = roll(state, P1, () => [3, 3]).state; // roundScore = 6
    const after = hold(rolled, P1);
    expect(after.status).toBe('FINISHED');
    expect(after.winnerId).toBe(P1);
  });

  it('rejects an action from a player whose turn it is not', () => {
    const state = createGame('g1', P1, P2, 100);
    expect(() => roll(state, P2, () => [3, 3])).toThrow(NotYourTurnError);
  });

  it('rejects any action once the game is finished', () => {
    const state = createGame('g1', P1, P2, 1);
    const rolled = roll(state, P1, () => [1, 1]).state;
    const finished = hold(rolled, P1);
    expect(() => roll(finished, P2, () => [1, 1])).toThrow(GameAlreadyFinishedError);
  });
});
