import { createGlobalStyle } from 'styled-components';

/**
 * Design tokens (as CSS custom properties) plus base document resets —
 * the ONE place with actual color/spacing/font values. Every styled
 * component reads them via var(--...) rather than a literal, so
 * re-theming the app means editing only this file. Rendered once, at the
 * root, by <GlobalStyles /> in App.tsx.
 */
export const GlobalStyles = createGlobalStyle`
  :root {
    /* Colors */
    --color-bg: #0d0d0d;
    --color-surface: #1a1816;
    --color-surface-raised: #241f1a;
    --color-ivory: #f5f0e6;
    --color-gold: #c9a24b;
    --color-gold-bright: #e0b85f;
    --color-red: #b3122c;
    --color-text: var(--color-ivory);
    --color-text-muted: #b8ae9c;
    --color-border: #3a332a;
    --color-danger: var(--color-red);
    --color-success: #4c8b5c;

    /* Typography */
    --font-heading: Georgia, 'Times New Roman', serif;
    --font-body: 'Segoe UI', system-ui, sans-serif;
    --font-size-sm: 0.85rem;
    --font-size-base: 1rem;
    --font-size-lg: 1.25rem;
    --font-size-xl: 1.75rem;
    --font-size-xxl: 2.5rem;

    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 16px;
    --space-4: 24px;
    --space-5: 40px;

    /* Misc */
    --radius: 8px;
    --radius-lg: 16px;
    --shadow-card: 0 4px 20px rgba(0, 0, 0, 0.5);
  }

  * {
    box-sizing: border-box;
  }

  html,
  body,
  #root {
    height: 100%;
  }

  body {
    margin: 0;
    background: var(--color-bg);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--font-size-base);
  }

  /* h1/h2/h3 are intentionally NOT styled globally here — see
     components/common/Typography.styles.ts (Heading1/2/3) instead, so
     each use can override without a specificity fight against a
     tag-name selector. */

  input {
    font-family: inherit;
    font-size: var(--font-size-base);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
  }

  input:focus {
    outline: 2px solid var(--color-gold);
    outline-offset: 1px;
  }
`;
