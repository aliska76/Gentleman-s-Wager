import styled from 'styled-components';

/**
 * Shared hover-dropdown mechanic — originally written for the header's nav
 * menu, now reused by SettingsMenu too, so this lives here once instead of
 * being copy-pasted per menu.
 */

/** Positioning context for a trigger button + its dropdown panel below. */
export const DropdownWrapper = styled.div`
  position: relative;
  display: inline-flex;
`;

/** Square icon-button trigger — same look for every dropdown's trigger. */
export const DropdownTrigger = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 4px;
  width: 40px;
  /*
   * 38px, not a rounder 36/40: with box-sizing:border-box, this button's
   * 1px border + 8px padding on each side leave exactly
   * 38 - 2*1 - 2*8 = 20px of content height, which is precisely what 4
   * lines (2px each) + 3 gaps (4px each) need. Any smaller and the flex
   * column overflows, so the browser silently shrinks the spans to fit —
   * by sub-pixel amounts that differ per span, which is what made some
   * lines look thicker than others.
   */
  height: 38px;
  padding: 8px;
  cursor: pointer;
  border: 1px solid var(--color-gold);
  background: var(--color-surface-raised);
  border-radius: var(--radius);
  color: var(--color-ivory);

  span {
    display: block;
    width: 100%;
    height: 2px;
    /* Belt-and-suspenders alongside the exact-fit height above: never
       let these shrink, even if the button's box model changes later. */
    flex-shrink: 0;
    background: var(--color-ivory);
    border-radius: 1px;
  }

  &:hover,
  &:focus-visible {
    background: var(--color-gold);
    color: var(--color-bg);
  }

  &:hover span,
  &:focus-visible span {
    background: var(--color-bg);
  }
`;

/**
 * Hidden by default; DropdownWrapper:hover/:focus-within (below) reveals
 * it. Only opens on genuine mouse hover or keyboard focus — touch screens
 * have no hover, so a tap opens it via :focus-within (most mobile browsers
 * focus a button on tap) but a second tap elsewhere is needed to pick an
 * item once revealed that way.
 */
export const DropdownPanel = styled.div`
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 180px;
  max-width: calc(100vw - 2 * var(--space-3));
  padding: var(--space-2);
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;

  ${DropdownWrapper}:hover &,
  ${DropdownWrapper}:focus-within & {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;
