import { IsWinningScore } from '../../../common/winning-score.decorator';

export class NewGameDto {
  @IsWinningScore("Score needed to win the rematch. Defaults to the previous game's winning score.")
  winningScore?: number;
}
