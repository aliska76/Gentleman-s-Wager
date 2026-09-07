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
 * Wraps both header dropdown triggers (settings gear, nav menu).
 * margin-left: auto keeps the whole group flush against the right edge of
 * whatever row it ends up on — including when Header's flex-wrap (above)
 * drops it onto its own line below Brand on narrow screens, where a lone
 * space-between item would otherwise sit at the left instead. That in turn
 * is what lets each DropdownPanel (components/common/DropdownMenu.styles)
 * anchor from `right: 0` and stay on-screen in both cases, rather than
 * guessing a fixed breakpoint for when wrapping starts.
 */
export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-left: auto;
`;

export const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
`;

export const Logo = styled.img`
  height: 70px;
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
