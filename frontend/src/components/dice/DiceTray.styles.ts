import styled, { keyframes } from 'styled-components';

export const Tray = styled.div<{ $busted?: boolean }>`
  display: flex;
  /*
   * Not a --space token — 32px is an empirically-matched value, not a
   * generic spacing choice. The dice's soft drop shadow (Face's box-shadow
   * in Die.styles.ts, a 20px blur) bleeds into the gap and visually eats
   * into it, so the same var(--space-3) gap GameControls' button row uses
   * reads as noticeably tighter here — checked side by side at several
   * gap sizes until this one matched the button row's spacing.
   */
  gap: 32px;
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
