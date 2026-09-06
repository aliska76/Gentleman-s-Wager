import styled from 'styled-components';

/**
 * Text primitives — alongside Button/Card, these are the shared building
 * blocks every screen composes with, instead of raw <h1>/<h2>/<h3>/<p>
 * styled ad hoc (or worse, globally by tag name, which can't be
 * overridden per-use without a specificity fight).
 */

export const Heading1 = styled.h1`
  font-family: var(--font-heading);
  color: var(--color-gold-bright);
  font-size: var(--font-size-xl);
  margin: 0;
`;

export const Heading2 = styled.h2`
  font-family: var(--font-heading);
  color: var(--color-gold-bright);
  font-size: var(--font-size-lg);
  margin: 0 0 var(--space-3);
`;

export const Heading3 = styled.h3`
  font-family: var(--font-heading);
  color: var(--color-gold-bright);
  font-size: var(--font-size-base);
  margin: 0;
`;

export const Text = styled.p`
  margin: 0;
  color: var(--color-text);
`;

export const MutedText = styled.p`
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
`;
