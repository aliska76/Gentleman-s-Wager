import styled from 'styled-components';

/** Mobile breakpoint below which two side-by-side player cards no longer fit — see PlayerCard. */
const MOBILE_BREAKPOINT = '480px';

export const Board = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  justify-content: center;

  /*
   * Below the breakpoint, this row itself stops being a layout box (its own
   * flex/gap/justify-content rules go inert) and its three children —
   * player 1's card, "vs", player 2's card — fall directly into Screen's
   * (the ancestor) flex column instead. That's what lets PlayerCard's own
   * "order: 99" below push player 2 all the way past the turn indicator,
   * dice and controls, landing it at the very bottom.
   */
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: contents;
  }
`;

export const Vs = styled.div`
  font-family: var(--font-heading);
  color: var(--color-text-muted);
  font-size: var(--font-size-lg);

  /* No natural place for "vs" once the two cards aren't side by side — the game board between them already makes the matchup clear. */
  @media (max-width: ${MOBILE_BREAKPOINT}) {
    display: none;
  }
`;

export const PlayerCard = styled.div<{ $active?: boolean; $won?: boolean; $position: 'first' | 'second' }>`
  background: var(--color-surface);
  border: 1px solid
    ${(props) => (props.$won ? 'var(--color-gold-bright)' : props.$active ? 'var(--color-gold)' : 'var(--color-border)')};
  border-radius: var(--radius-lg);
  padding: var(--space-3) var(--space-4);
  text-align: center;
  min-width: 160px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  ${(props) => props.$active && 'box-shadow: 0 0 0 1px var(--color-gold);'}

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    width: 100%;
    /* Player 1 stays put (order 0, same as every other Screen child); only
       player 2 jumps past the turn indicator/dice/controls to the bottom. */
    ${(props) => props.$position === 'second' && 'order: 99;'}
  }
`;

export const Score = styled.p`
  font-size: var(--font-size-xxl);
  font-family: var(--font-heading);
  color: var(--color-ivory);
  margin: var(--space-1) 0;
`;

/**
 * Always rendered (see ScoreBoard.tsx) so both player cards reserve the
 * same line for it — otherwise the active player's card, with this line
 * filled in, ends up taller than the other one.
 */
export const RoundScore = styled.p<{ $visible?: boolean }>`
  color: var(--color-gold);
  font-size: var(--font-size-sm);
  margin: 0;
  visibility: ${(props) => (props.$visible ? 'visible' : 'hidden')};
`;

export const WinnerBadge = styled.span`
  display: inline-block;
  margin-top: var(--space-2);
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--color-gold);
  color: var(--color-bg);
  font-size: var(--font-size-sm);
  font-weight: bold;
`;
