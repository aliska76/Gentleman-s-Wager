import { rollTwoDice } from '../../domain/game-engine';
import { IDiceRoller } from '../../domain/ports/dice-roller.port';

/**
 * The original Math.random-based implementation (domain/game-engine's
 * rollTwoDice), wrapped as a port adapter and kept as the fallback for
 * when rpg-dice-roller is unavailable or misbehaves.
 */
export class MathRandomDiceRollerAdapter implements IDiceRoller {
  roll(): [number, number] {
    return rollTwoDice();
  }
}
