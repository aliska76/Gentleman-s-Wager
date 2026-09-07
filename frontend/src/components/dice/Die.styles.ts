import styled from 'styled-components';

/** Only used within this file, to size the Scene/Cube box and derive HALF below. */
const CUBE_SIZE = 64;
const HALF = CUBE_SIZE / 2;

/** The box the cube rotates inside — perspective lives here, not on the cube itself. */
export const Scene = styled.div`
  width: ${CUBE_SIZE}px;
  height: ${CUBE_SIZE}px;
  perspective: 300px;
  flex-shrink: 0;
`;

/** The rotating 3D object itself — Motion animates rotateX/rotateY on this (see Die.tsx). */
export const Cube = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
`;

const FACE_TRANSFORMS = {
  front: `translateZ(${HALF}px)`,
  back: `rotateY(180deg) translateZ(${HALF}px)`,
  right: `rotateY(90deg) translateZ(${HALF}px)`,
  left: `rotateY(-90deg) translateZ(${HALF}px)`,
  top: `rotateX(90deg) translateZ(${HALF}px)`,
  bottom: `rotateX(-90deg) translateZ(${HALF}px)`,
} as const;

export type CubeFace = keyof typeof FACE_TRANSFORMS;

/**
 * Every face carries the same pip pattern (the die's current value) — see
 * Die.tsx's comment for why: only one face is ever visible at rest, so
 * there's nothing to tell apart from a die with six distinct faces, and it
 * avoids having to pin an exact rotation-to-value mapping.
 */
export const Face = styled.div<{ $face: CubeFace }>`
  position: absolute;
  inset: 0;
  background: var(--color-ivory);
  border-radius: var(--radius);
  box-shadow: var(--shadow-card);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 2px;
  padding: 8px;
  backface-visibility: hidden;
  transform: ${(props) => FACE_TRANSFORMS[props.$face]};
`;

/** Pip diameter — fixed px, not a percentage of the grid cell. */
const PIP_SIZE = 11;

/*
 * A fixed pixel size (plus place-self: center to sit in the middle of its
 * grid cell) rather than a percentage of the cell keeps every pip
 * identically sized no matter what. A percentage-based size ties each
 * pip's size to its own column/row track, and equal fr tracks
 * (grid-template-columns/rows: repeat(3, 1fr) in Die.styles.ts's Face)
 * aren't guaranteed to land on whole pixels — 48px of content minus 2
 * gaps of 2px, divided 3 ways, is 14.67px per track — so different
 * browsers can round different tracks up or down by a pixel, making
 * same-size pips read as visibly different sizes. Fixed px sizing doesn't
 * care how the surrounding track rounded.
 */
export const Cell = styled.span<{ $pip?: boolean; $accent?: boolean }>`
  width: ${PIP_SIZE}px;
  height: ${PIP_SIZE}px;
  place-self: center;
  border-radius: 50%;
  background: ${(props) =>
    props.$accent ? 'var(--color-red)' : props.$pip ? 'var(--color-bg)' : 'transparent'};
`;
