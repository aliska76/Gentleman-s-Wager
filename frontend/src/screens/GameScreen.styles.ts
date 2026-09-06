import styled from 'styled-components';
import { Card } from '../components/common/Card.styles';

export const Screen = styled(Card)`
  max-width: 480px;
  margin: var(--space-5) auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
`;

export const FinishedActions = styled.div`
  display: flex;
  gap: var(--space-3);
`;

export const ErrorText = styled.p`
  color: var(--color-danger);
  font-size: var(--font-size-sm);
  margin: 0;
`;

export const TargetScore = styled.p`
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin: 0;
`;
