import styled from 'styled-components';

export const Shell = styled.div`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

export const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);

  @media (max-width: 480px) {
    padding: var(--space-3);
  }
`;

/**
 * Positioning context for the menu button + its dropdown below.
 * margin-left: auto keeps this flush against the right edge of whatever
 * row it ends up on — including when Header's flex-wrap (above) drops it
 * onto its own line below Brand on narrow screens, where a lone
 * space-between item would otherwise sit at the left instead. That in
 * turn is what lets Nav anchor from `right: 0` and stay on-screen in both
 * cases, rather than guessing a fixed breakpoint for when wrapping starts.
 */
export const MenuWrapper = styled.div`
  position: relative;
  display: inline-flex;
  margin-left: auto;
`;

/** The "4 horizontal bars" trigger — hovering (or focusing, for keyboard use) it reveals Nav. */
export const MenuButton = styled.button`
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  width: 40px;
  height: 36px;
  padding: 9px 8px;
  cursor: pointer;
  border: 1px solid var(--color-gold);
  background: var(--color-surface-raised);
  border-radius: var(--radius);

  span {
    display: block;
    height: 2px;
    background: var(--color-ivory);
    border-radius: 1px;
  }

  &:hover,
  &:focus-visible {
    background: var(--color-gold);
  }

  &:hover span,
  &:focus-visible span {
    background: var(--color-bg);
  }
`;

/**
 * Hidden by default; MenuWrapper:hover/:focus-within (below) reveals it.
 * Note this only opens on genuine mouse hover or keyboard focus — touch
 * screens have no hover, so a tap on MenuButton opens it via :focus-within
 * (most mobile browsers focus a button on tap) but a second tap elsewhere
 * is needed to actually pick an item once revealed that way.
 */
export const Nav = styled.nav`
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

  ${MenuWrapper}:hover &,
  ${MenuWrapper}:focus-within & {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
  }
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

export const Logo = styled.img`
  height: 40px;
  width: auto;
  display: block;
`;

export const Main = styled.main`
  flex: 1;
  padding: var(--space-4);

  @media (max-width: 480px) {
    padding: var(--space-3);
  }
`;
