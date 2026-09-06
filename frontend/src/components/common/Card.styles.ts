import styled from 'styled-components';

/** The shared card surface — screens extend this with `styled(Card)` for their own layout. */
export const Card = styled.div`
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-4);
`;
