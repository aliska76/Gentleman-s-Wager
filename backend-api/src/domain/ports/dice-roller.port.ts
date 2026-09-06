export const DICE_ROLLER = Symbol('DICE_ROLLER');

/**
 * Rolls two six-sided dice, returning each individual face value as a
 * tuple — mirrors domain/game-engine's `DiceRoller` function type exactly,
 * so the application layer can adapt `IDiceRoller.roll()` to it with a
 * one-line closure (`() => this.dice.roll()`) without the domain layer
 * knowing this port, or any concrete RNG, exists at all.
 */
export interface IDiceRoller {
  roll(): [number, number];
}
