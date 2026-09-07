import styled from 'styled-components';
import { Card } from '../components/common/Card.styles';

export const Screen = styled(Card)`
  /*
   * max(480px, 45vw): on a narrow/mobile viewport 45vw is well under
   * 480px, so max-width just stays 480px — today's behavior, unchanged.
   * Past ~1067px wide (where 45vw overtakes 480px) the card instead grows
   * to 45% of the viewport, so it takes up more of a wide screen instead
   * of staying pinned at a fixed 480px regardless of how much room there is.
   */
  max-width: max(480px, 45vw);
  margin: var(--space-5) auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);

  /* A little closer to the header on mobile — var(--space-5) (40px) on
     top of Main's own padding read as too much empty space above the card
     on a small screen; the bottom margin is untouched. */
  @media (max-width: 480px) {
    margin-top: var(--space-2);
  }
`;

export const FinishedActions = styled.div`
  display: flex;
  gap: var(--space-3);
`;

export const TargetScore = styled.p`
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0;
`;
