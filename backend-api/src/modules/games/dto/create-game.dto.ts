import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
import { IsWinningScore } from '../../../common/winning-score.decorator';

export class CreateGameDto {
  @ApiProperty({ description: 'userId of the opponent to play against', example: 'clx1a2b3c4d5e6f7g8h9i0' })
  @IsString()
  opponentUserId!: string;

  @IsWinningScore('Score needed to win. Defaults to the server-configured default.')
  winningScore?: number;
}
