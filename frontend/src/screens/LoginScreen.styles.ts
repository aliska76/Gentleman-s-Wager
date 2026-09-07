import styled from 'styled-components';
import { Card } from '../components/common/Card.styles';

export const Screen = styled(Card)`
  max-width: 400px;
  margin: var(--space-5) auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
`;

export const Choices = styled.div`
  display: flex;
  gap: var(--space-3);
`;

export const ScoreLabel = styled.label`
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
`;
