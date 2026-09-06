import { createGame, hold } from '../../src/domain/game-engine';
import { decideBotMove } from '../../src/domain/bot-policy';

const BOT_ID = 'bot-1';
const HUMAN_ID = 'human-1';

describe('decideBotMove', () => {
  it('rolls when the round score is below the threshold and nowhere near winning', () => {
    const state = { ...createGame('g1', HUMAN_ID, BOT_ID, 100), currentPlayerId: BOT_ID, roundScore: 5 };
    expect(decideBotMove(state, BOT_ID)).toEqual({ action: 'roll' });
  });

  it('holds once the round score reaches the threshold', () => {
    const state = { ...createGame('g1', HUMAN_ID, BOT_ID, 100), currentPlayerId: BOT_ID, roundScore: 20 };
    expect(decideBotMove(state, BOT_ID)).toEqual({ action: 'hold' });
  });

  it('respects a custom threshold', () => {
    const state = { ...createGame('g1', HUMAN_ID, BOT_ID, 100), currentPlayerId: BOT_ID, roundScore: 8 };
    expect(decideBotMove(state, BOT_ID, 8)).toEqual({ action: 'hold' });
    expect(decideBotMove(state, BOT_ID, 9)).toEqual({ action: 'roll' });
  });

  it('holds below the threshold if holding now would already win', () => {
    // score2 (bot, as player2) = 85, roundScore = 10 -> projected 95 >= winningScore 90
    const state = { ...createGame('g1', HUMAN_ID, BOT_ID, 90), currentPlayerId: BOT_ID, score2: 85, roundScore: 10 };
    expect(decideBotMove(state, BOT_ID)).toEqual({ action: 'hold' });
  });

  it('works the same way when the bot is player1', () => {
    const state = { ...createGame('g1', BOT_ID, HUMAN_ID, 90), currentPlayerId: BOT_ID, score1: 85, roundScore: 10 };
    expect(decideBotMove(state, BOT_ID)).toEqual({ action: 'hold' });
  });

  it('never holds at the very start of its turn (round score always 0 there)', () => {
    // Confirms the "no special case needed" reasoning in bot-policy.ts:
    // hold() always resets roundScore to 0 for whoever the turn passes to.
    const fresh = createGame('g1', HUMAN_ID, BOT_ID, 100);
    const afterHold = hold({ ...fresh, roundScore: 12 }, HUMAN_ID);

    expect(afterHold.currentPlayerId).toBe(BOT_ID);
    expect(afterHold.roundScore).toBe(0);
    expect(decideBotMove(afterHold, afterHold.currentPlayerId)).toEqual({ action: 'roll' });
  });
});
