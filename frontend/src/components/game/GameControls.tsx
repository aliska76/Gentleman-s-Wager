import { Button } from '../common/Button.styles';
import { Controls } from './GameControls.styles';

interface GameControlsProps {
  canAct: boolean;
  isPending: boolean;
  onRoll: () => void;
  onHold: () => void;
  className?: string;
}

/** Roll/Hold — disabled whenever it isn't a human's turn to act, or a request is in flight. */
export function GameControls({ canAct, isPending, onRoll, onHold, className }: GameControlsProps) {
  return (
    <Controls className={className} data-testid="game-controls">
      <Button data-testid="roll-button" onClick={onRoll} disabled={!canAct || isPending}>
        Roll
      </Button>
      <Button data-testid="hold-button" onClick={onHold} disabled={!canAct || isPending}>
        Hold
      </Button>
    </Controls>
  );
}
