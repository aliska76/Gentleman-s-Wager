import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Query params arrive as strings — `@Type(() => Number)` is what makes
 * the global ValidationPipe's `transform: true` actually coerce
 * "?limit=20" into the number 20 before `@IsInt()`/`@Min()` run, the same
 * way JSON body numbers already arrive as numbers without needing this
 * (see CreateGameDto/NewGameDto).
 */
export class LeaderboardQueryDto {
  @ApiPropertyOptional({ description: 'Page size.', example: 10, minimum: 1, maximum: 100, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Rows to skip, for the next page.', example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
