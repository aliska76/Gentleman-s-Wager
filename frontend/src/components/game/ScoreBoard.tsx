import type { GameState } from '../../types/game';
import { Heading3 } from '../common/Typography.styles';
import { Board, PlayerCard, RoundScore, Score, Vs, WinnerBadge } from './ScoreBoard.styles';

interface PlayerCardContentProps {
  testId: string;
  name: string;
  score: number;
  roundScore: number;
  active: boolean;
  won: boolean;
  position: 'first' | 'second';
}

function PlayerCardContent({ testId, name, score, roundScore, active, won, position }: PlayerCardContentProps) {
  return (
    <PlayerCard $active={active} $won={won} $position={position} data-testid={testId}>
      <Heading3>{name}</Heading3>
      <Score data-testid={`${testId}-score`}>{score}</Score>
      {active && roundScore > 0 && <RoundScore data-testid={`${testId}-round-score`}>+{roundScore} this turn</RoundScore>}
      {won && <WinnerBadge data-testid={`${testId}-winner-badge`}>Winner</WinnerBadge>}
    </PlayerCard>
  );
}

interface ScoreBoardProps {
  game: GameState;
  player1Label: string;
  player2Label: string;
  className?: string;
}

/**
 * Above ~480px wide, player 1's card, "vs" and player 2's card sit in one
 * row, as before. Below it, this row (Board) stops being a layout box of
 * its own — see ScoreBoard.styles.ts — so player 1's card stays at the top
 * while player 2's card is pushed past the turn indicator/dice/controls to
 * the bottom: player 1, the game, player 2.
 */
export function ScoreBoard({ game, player1Label, player2Label, className }: ScoreBoardProps) {
  const isPlayer1Turn = game.currentPlayerId === game.player1Id;
  const inProgress = game.status === 'IN_PROGRESS';

  return (
    <Board className={className} data-testid="scoreboard">
      <PlayerCardContent
        testId="player-card-1"
        name={player1Label}
        score={game.score1}
        roundScore={isPlayer1Turn ? game.roundScore : 0}
        active={inProgress && isPlayer1Turn}
        won={game.winnerId === game.player1Id}
        position="first"
      />
      <Vs>vs</Vs>
      <PlayerCardContent
        testId="player-card-2"
        name={player2Label}
        score={game.score2}
        roundScore={!isPlayer1Turn ? game.roundScore : 0}
        active={inProgress && !isPlayer1Turn}
        won={game.winnerId === game.player2Id}
        position="second"
      />
    </Board>
  );
}
