import { Logger } from '@nestjs/common';
import { GameState } from '../../src/domain/entities';
import { BatchedGameWriteBuffer } from '../../src/infrastructure/persistence/batched-game-write-buffer';
import { FakeGameRepository } from '../mocks/fake-game-repository';

function stateFor(id: string, roundScore: number): GameState {
  return {
    id,
    player1Id: 'p1',
    player2Id: 'p2',
    winningScore: 100,
    status: 'IN_PROGRESS',
    winnerId: null,
    currentPlayerId: 'p1',
    score1: 0,
    score2: 0,
    roundScore,
  };
}

/**
 * Exercises BatchedGameWriteBuffer directly against a real IGameRepository
 * fake (not through GamesService/FakeGameWriteBuffer) — this is the one
 * class that actually implements the coalescing, batching and
 * failure-retry behaviour ARCHITECTURE.md §8.3 describes, so it needs its
 * own coverage rather than being trusted by inference from GamesService's
 * tests (which only ever exercise the fake).
 */
describe('BatchedGameWriteBuffer', () => {
  let games: FakeGameRepository;
  let buffer: BatchedGameWriteBuffer;

  beforeEach(async () => {
    games = new FakeGameRepository();
    // saveMany updates existing rows — seed them first, same as a real game already having been created.
    await games.create(stateFor('game-1', 0));
    await games.create(stateFor('game-2', 0));
    buffer = new BatchedGameWriteBuffer(games);
  });

  afterEach(async () => {
    await buffer.onModuleDestroy();
    jest.restoreAllMocks(); // undoes the Logger.error suppression below, if a test used it
  });

  it('does nothing on flush when nothing is queued', async () => {
    const saveManySpy = jest.spyOn(games, 'saveMany');
    await buffer.flush();
    expect(saveManySpy).not.toHaveBeenCalled();
  });

  it('writes every queued game in one batch and clears the queue', async () => {
    const a = stateFor('game-1', 5);
    const b = stateFor('game-2', 9);
    buffer.enqueue(a);
    buffer.enqueue(b);

    await buffer.flush();

    expect(await games.findById('game-1')).toEqual(a);
    expect(await games.findById('game-2')).toEqual(b);

    const saveManySpy = jest.spyOn(games, 'saveMany');
    await buffer.flush(); // the queue was cleared by the flush above
    expect(saveManySpy).not.toHaveBeenCalled();
  });

  it('coalesces repeated enqueues for the same game into just the latest state', async () => {
    buffer.enqueue(stateFor('game-1', 5));
    buffer.enqueue(stateFor('game-1', 11)); // supersedes the one above — same game id
    const saveManySpy = jest.spyOn(games, 'saveMany');

    await buffer.flush();

    expect(saveManySpy).toHaveBeenCalledTimes(1);
    expect(saveManySpy.mock.calls[0][0]).toHaveLength(1); // one row written, not two
    expect((await games.findById('game-1'))?.roundScore).toBe(11);
  });

  it('discard drops a queued state without ever writing it', async () => {
    buffer.enqueue(stateFor('game-1', 5));
    buffer.discard('game-1');
    const saveManySpy = jest.spyOn(games, 'saveMany');

    await buffer.flush();

    expect(saveManySpy).not.toHaveBeenCalled();
    expect((await games.findById('game-1'))?.roundScore).toBe(0); // untouched
  });

  it('re-queues everything for the next attempt when a flush fails, instead of losing it', async () => {
    // This test deliberately triggers the failure path — silence the
    // Logger.error it logs by design, so a healthy test run doesn't print
    // what looks like a real error. Purely cosmetic: flush()'s behaviour
    // (see the assertions below) is unaffected either way.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    buffer.enqueue(stateFor('game-1', 5));
    jest.spyOn(games, 'saveMany').mockRejectedValueOnce(new Error('DB is down'));

    await expect(buffer.flush()).resolves.toBeUndefined(); // never throws out of flush()
    expect((await games.findById('game-1'))?.roundScore).toBe(0); // roundScore not written yet

    await buffer.flush(); // retried, this time against the real (unmocked) saveMany
    expect((await games.findById('game-1'))?.roundScore).toBe(5);
  });

  it('never overwrites a newer state that was enqueued while a failed flush was in flight', async () => {
    // Same cosmetic suppression as the test above — this one also
    // deliberately fails a flush.
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    buffer.enqueue(stateFor('game-1', 5));
    jest.spyOn(games, 'saveMany').mockImplementationOnce(async () => {
      // Simulates GamesService enqueueing a fresher roll for this same
      // game while this flush's DB call is still in flight.
      buffer.enqueue(stateFor('game-1', 40));
      throw new Error('DB is down');
    });

    await buffer.flush(); // fails; must not clobber the fresher enqueue() above with the stale one
    await buffer.flush(); // retry, against the real saveMany

    expect((await games.findById('game-1'))?.roundScore).toBe(40); // the fresher state won, not the stale 5
  });
});
