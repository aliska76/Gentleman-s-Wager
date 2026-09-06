import styled from 'styled-components';
import { Card } from '../components/common/Card.styles';

export const Screen = styled(Card)`
  max-width: 480px;
  margin: var(--space-5) auto;
`;

export const ErrorText = styled.p`
  color: var(--color-danger);
`;
