import styled from 'styled-components';

export const Controls = styled.div`
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  /* On top of Screen's own var(--space-4) gap above this element, for a
     bit more breathing room between the dice and the Roll/Hold buttons. */
  margin-top: var(--space-2);
`;
