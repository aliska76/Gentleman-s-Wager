import { DiceRoller as ThirdPartyDiceRoller, NumberGenerator } from '@dice-roller/rpg-dice-roller';
import { IDiceRoller } from '../../domain/ports/dice-roller.port';

// The library's default RNG engine (`nativeMath`) is plain `Math.random`
// under the hood — picking this library alone changes nothing about
// randomness quality, only the notation-parsing API. Switching explicitly
// to the Node crypto engine is what actually delivers on the reason we
// wanted a dedicated dice library: `Math.random` is not cryptographically
// secure, so its output could in principle be predicted from enough prior
// rolls (published research exists on reversing V8's PRNG state) — a real,
// if niche, concern for a game literally branded around a wager.
// `NumberGenerator.generator` is a process-wide singleton in the library,
// so this is set once, here, at module load, rather than per roll.
NumberGenerator.generator.engine = NumberGenerator.engines.nodeCrypto;

/**
 * Wraps the `@dice-roller/rpg-dice-roller` library — a purpose-built,
 * independently-tested dice engine — instead of hand-rolled `Math.random`
 * arithmetic. Rolled one die at a time (`1d6` twice) and read via `.total`
 * rather than digging into the library's roll-group/result-object shape:
 * `.total` is the one property documented at every level of its docs, so
 * this adapter depends on the smallest possible surface of that API.
 *
 * Every result is validated before being trusted — if the library ever
 * returns something outside two integers in [1,6] (a breaking API change,
 * a version mismatch), this throws. GracefulDiceRollerAdapter catches
 * that and falls back to MathRandomDiceRollerAdapter, so a problem in
 * this dependency degrades the game, it never crashes it.
 */
export class RpgDiceRollerAdapter implements IDiceRoller {
  roll(): [number, number] {
    const roller = new ThirdPartyDiceRoller();
    const a = this.rollOneDie(roller);
    const b = this.rollOneDie(roller);

    if (!isValidDie(a) || !isValidDie(b)) {
      throw new Error(`rpg-dice-roller returned an unexpected result: [${a}, ${b}]`);
    }

    return [a, b];
  }

  /**
   * `DiceRoller.roll(...notations)` is variadic, so its return type is
   * `DiceRoll | DiceRoll[]` — passing exactly one notation ('1d6') always
   * returns a single `DiceRoll` at runtime, but TypeScript can't know
   * that from the call site alone, so the array case is narrowed away
   * explicitly here instead of asserting the type.
   */
  private rollOneDie(roller: ThirdPartyDiceRoller): number {
    const result = roller.roll('1d6');
    const single = Array.isArray(result) ? result[0] : result;
    return single.total;
  }
}

function isValidDie(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 6;
}
