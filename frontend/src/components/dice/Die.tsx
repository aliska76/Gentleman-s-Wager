import { motion } from 'motion/react';
import { Cube, Face, Scene, Cell, type CubeFace } from './Die.styles';
import { getAccentPipIndex, getPipPositions, DIE_GRID_SIZE } from './dice.utils';

// motion.create() wraps Cube (a styled-components div, which already
// forwards its ref) so it accepts animate/transition props on top of its
// usual styling.
const MotionCube = motion.create(Cube);

const FACES: CubeFace[] = ['front', 'back', 'right', 'left', 'top', 'bottom'];

/**
 * A couple of extra full turns per axis (multiples of 360, so the visual
 * end orientation is identical to the start — flat, front face towards the
 * camera) makes the cube tumble through both axes before settling back
 * into its resting pose, where the newly-updated pip pattern is revealed.
 */
const ROLL_ANIMATION = { rotateX: [0, 720], rotateY: [0, 1080] };
const ROLL_TRANSITION = { duration: 0.7, ease: 'easeOut' as const };

interface DieProps {
  value: number | null;
  /** Tints the last pip red — a small accent flourish, used on one die in a DiceTray. */
  accent?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function Die({ value, accent, className, 'data-testid': testId }: DieProps) {
  const pips = getPipPositions(value);
  const accentIndex = getAccentPipIndex(pips, accent);

  return (
    <Scene
      className={className}
      role="img"
      aria-label={value ? `Die showing ${value}` : 'Die, not yet rolled'}
      data-testid={testId ?? 'die'}
    >
      <MotionCube animate={ROLL_ANIMATION} transition={ROLL_TRANSITION}>
        {FACES.map((face) => (
          <Face key={face} $face={face}>
            {Array.from({ length: DIE_GRID_SIZE }, (_, i) => (
              <Cell key={i} $pip={pips.includes(i)} $accent={i === accentIndex} />
            ))}
          </Face>
        ))}
      </MotionCube>
    </Scene>
  );
}
