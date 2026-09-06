import type { GameState } from '../../types/game';
import { Indicator } from './TurnIndicator.styles';

interface TurnIndicatorProps {
  game: GameState;
  currentPlayerLabel: string;
  isBotThinking: boolean;
  className?: string;
}

export function TurnIndicator({ game, currentPlayerLabel, isBotThinking, className }: TurnIndicatorProps) {
  if (game.status === 'FINISHED') {
    return (
      <Indicator $finished className={className} data-testid="turn-indicator">
        Game over
      </Indicator>
    );
  }
  if (isBotThinking) {
    return (
      <Indicator className={className} data-testid="turn-indicator">
        {currentPlayerLabel} is thinking…
      </Indicator>
    );
  }
  return (
    <Indicator className={className} data-testid="turn-indicator">
      {currentPlayerLabel}&rsquo;s turn
    </Indicator>
  );
}
