import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * The optional `winningScore` field accepted by both CreateGameDto and
 * NewGameDto — identical validation (optional positive integer) in both,
 * previously copy-pasted between the two DTOs with only the Swagger
 * description differing. `description` is still per-call-site since "score
 * needed to win" and "score needed to win the rematch" genuinely mean
 * different things to someone reading the generated Swagger docs.
 */
export function IsWinningScore(description: string) {
  return applyDecorators(
    ApiPropertyOptional({ description, example: 100, minimum: 1 }),
    IsOptional(),
    IsInt(),
    Min(1),
  );
}
