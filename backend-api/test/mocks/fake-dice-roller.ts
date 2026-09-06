import { IDiceRoller } from '../../src/domain/ports/dice-roller.port';

/**
 * Defaults to a fixed non-bust roll. Tests override specific calls with
 * `jest.spyOn(dice, 'roll').mockReturnValueOnce([a, b])` — spying on a
 * real method on a real object, rather than the old approach of mocking
 * `Math.random` and reverse-engineering the floats domain/game-engine's
 * rollTwoDice() would need to produce a given face value.
 */
export class FakeDiceRoller implements IDiceRoller {
  roll(): [number, number] {
    return [1, 2];
  }
}
