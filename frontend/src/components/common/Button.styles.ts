import styled from 'styled-components';

/**
 * The one button style used everywhere in the app — hover/active/disabled
 * states live here, once, instead of being re-declared per screen.
 */
export const Button = styled.button`
  font-family: inherit;
  font-size: var(--font-size-base);
  cursor: pointer;
  border: 1px solid var(--color-gold);
  background: var(--color-surface-raised);
  color: var(--color-ivory);
  border-radius: var(--radius);
  padding: var(--space-2) var(--space-4);
  transition: background 0.15s ease, transform 0.05s ease;

  &:hover:not(:disabled) {
    background: var(--color-gold);
    color: var(--color-bg);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
