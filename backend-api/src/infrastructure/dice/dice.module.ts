import { Module } from '@nestjs/common';
import { DICE_ROLLER } from '../../domain/ports/dice-roller.port';
import { GracefulDiceRollerAdapter } from './graceful-dice-roller.adapter';

@Module({
  providers: [{ provide: DICE_ROLLER, useClass: GracefulDiceRollerAdapter }],
  exports: [DICE_ROLLER],
})
export class DiceModule {}
