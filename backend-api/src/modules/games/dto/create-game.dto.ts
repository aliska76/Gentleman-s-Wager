import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateGameDto {
  @ApiProperty({ description: 'userId of the opponent to play against', example: 'clx1a2b3c4d5e6f7g8h9i0' })
  @IsString()
  opponentUserId!: string;

  @ApiPropertyOptional({ description: 'Score needed to win. Defaults to the server-configured default.', example: 100, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  winningScore?: number;
}
