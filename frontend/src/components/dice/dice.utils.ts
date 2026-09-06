/**
 * Pure lookup/derivation logic for rendering a die face as a 3x3 grid of
 * pips (dots). Kept out of Die.tsx so the component only deals with
 * markup, and this table/math can be unit-tested or reused on its own.
 */

/** A die face is drawn as a 3x3 grid; cells are indexed 0-8, row-major. */
export const DIE_GRID_SIZE = 9;

/** Which of the 9 grid cells hold a pip, per die face value (1-6). */
const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

/** Grid cell indices that should show a pip for the given face value (or none if not yet rolled). */
export function getPipPositions(value: number | null): number[] {
  if (!value) return [];
  return PIP_LAYOUTS[value] ?? [];
}

/** Which single pip (if any) should get the accent tint — always the last one in the layout. */
export function getAccentPipIndex(pips: number[], accent: boolean | undefined): number {
  if (!accent || pips.length === 0) return -1;
  return pips[pips.length - 1];
}
