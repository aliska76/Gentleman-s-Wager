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

export const Nav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
`;

export const Main = styled.main`
  flex: 1;
  padding: var(--space-4);

  @media (max-width: 480px) {
    padding: var(--space-3);
  }
`;
