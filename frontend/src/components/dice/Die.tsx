import { motion } from 'motion/react';
import { Cell, DieGrid } from './Die.styles';
import { getAccentPipIndex, getPipPositions, DIE_GRID_SIZE } from './dice.utils';

// Defined once at module scope (not per-render) — motion.create() wraps
// DieGrid (a styled-components div, which already forwards its ref to the
// underlying element) so it accepts animate/transition props on top of its
// usual styling.
const MotionDieGrid = motion.create(DieGrid);

/** A quick tumble-and-settle: a wobble in rotation plus a small hop and bounce in scale. */
const ROLL_ANIMATION = {
  rotate: [0, -14, 11, -6, 3, 0],
  y: [0, -10, 0, -3, 0],
  scale: [1, 1.06, 0.96, 1.02, 1],
};
const ROLL_TRANSITION = { duration: 0.6, ease: 'easeOut' as const };

interface DieProps {
  value: number | null;
  /** Tints the last pip red — the logo's flourish, used on one die in a DiceTray. */
  accent?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Die({ value, accent, className, 'data-testid': testId }: DieProps) {
  const pips = getPipPositions(value);
  const accentIndex = getAccentPipIndex(pips, accent);

  return (
    <MotionDieGrid
      className={className}
      role="img"
      aria-label={value ? `Die showing ${value}` : 'Die, not yet rolled'}
      data-testid={testId ?? 'die'}
      animate={ROLL_ANIMATION}
      transition={ROLL_TRANSITION}
    >
      {Array.from({ length: DIE_GRID_SIZE }, (_, i) => (
        <Cell key={i} $pip={pips.includes(i)} $accent={i === accentIndex} />
      ))}
    </MotionDieGrid>
  );
}
