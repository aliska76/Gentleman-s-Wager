import { Die } from './Die';
import { BustLabel, Tray } from './DiceTray.styles';

interface DiceTrayProps {
  dice: [number, number] | null;
  busted?: boolean;
  /**
   * Bumped on every roll (even a repeat value) so the dice remount and
   * their flip animation replays — see Die.styles.ts.
   */
  rollId?: number;
  className?: string;
}

export function DiceTray({ dice, busted, rollId, className }: DiceTrayProps) {
  return (
    <Tray $busted={busted} className={className} data-testid="dice-tray">
      <Die key={`die-1-${rollId ?? 'initial'}`} value={dice ? dice[0] : null} accent data-testid="die-1" />
      <Die key={`die-2-${rollId ?? 'initial'}`} value={dice ? dice[1] : null} data-testid="die-2" />
      {busted && <BustLabel data-testid="dice-tray-bust-label">Bust!</BustLabel>}
    </Tray>
  );
}
