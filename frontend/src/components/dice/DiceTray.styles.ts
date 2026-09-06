import styled, { keyframes } from 'styled-components';

export const Tray = styled.div<{ $busted?: boolean }>`
  display: flex;
  /*
   * space-4, not space-3 (what GameControls' button row uses) — the dice's
   * soft drop shadow (Face's box-shadow in Die.styles.ts) bleeds into a
   * same-size gap and reads as visibly tighter than the crisp-bordered
   * buttons below it, even though the raw gap would be identical. The
   * extra space compensates so the two rows read as evenly spaced.
   */
  gap: var(--space-4);
  align-items: center;
  min-height: 64px;

  ${(props) => props.$busted && `& > div { outline: 2px solid var(--color-danger); }`}
`;

/** Draws the eye to the bust message during the brief action-lock that follows a 6 & 6. */
const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.08); }
`;

export const BustLabel = styled.span`
  color: var(--color-danger);
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  animation: ${pulse} 0.5s ease-in-out 2;
`;
