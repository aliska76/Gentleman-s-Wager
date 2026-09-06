import { Injectable, Logger } from '@nestjs/common';
import { IDiceRoller } from '../../domain/ports/dice-roller.port';
import { MathRandomDiceRollerAdapter } from './math-random-dice-roller.adapter';
import { RpgDiceRollerAdapter } from './rpg-dice-roller.adapter';

/**
 * Primary: rpg-dice-roller. Fallback: Math.random. Same graceful-
 * degradation shape as RedisCacheService (ARCHITECTURE.md §9) — a
 * dependency that can misbehave, rather than one that can disconnect —
 * so a game in progress is never blocked on this library working.
 *
 * The two adapters it composes are plain classes, not NestJS providers:
 * neither has dependencies of its own, so there's nothing DI needs to
 * resolve for them — `new` is simpler than registering two extra tokens
 * for objects nothing else ever consumes directly.
 */
@Injectable()
export class GracefulDiceRollerAdapter implements IDiceRoller {
  private readonly logger = new Logger(GracefulDiceRollerAdapter.name);
  private readonly primary = new RpgDiceRollerAdapter();
  private readonly fallback = new MathRandomDiceRollerAdapter();

  roll(): [number, number] {
    try {
      return this.primary.roll();
    } catch (error) {
      this.logger.warn(`rpg-dice-roller failed, falling back to Math.random: ${(error as Error).message}`);
      return this.fallback.roll();
    }
  }
}
