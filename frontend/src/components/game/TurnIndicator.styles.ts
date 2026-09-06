import styled from 'styled-components';

export const Indicator = styled.p<{ $finished?: boolean }>`
  text-align: center;
  font-family: var(--font-heading);
  font-size: var(--font-size-lg);
  color: ${(props) => (props.$finished ? 'var(--color-danger)' : 'var(--color-gold-bright)')};
  margin: 0;
`;
