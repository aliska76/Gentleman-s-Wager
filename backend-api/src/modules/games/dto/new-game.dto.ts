import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class NewGameDto {
  @ApiPropertyOptional({ description: 'Score needed to win the rematch. Defaults to the previous game\'s winning score.', example: 100, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  winningScore?: number;
}
