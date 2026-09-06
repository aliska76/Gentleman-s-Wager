import styled from 'styled-components';

/** Rolling motion is applied via Motion (see Die.tsx) — this is just the static shape/surface. */
export const DieGrid = styled.div`
  width: 64px;
  height: 64px;
  background: var(--color-ivory);
  border-radius: var(--radius);
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  padding: 8px;
  box-shadow: var(--shadow-card);
  flex-shrink: 0;
`;

export const Cell = styled.span<{ $pip?: boolean; $accent?: boolean }>`
  border-radius: 50%;
  background: ${(props) =>
    props.$accent ? 'var(--color-red)' : props.$pip ? 'var(--color-bg)' : 'transparent'};
`;
