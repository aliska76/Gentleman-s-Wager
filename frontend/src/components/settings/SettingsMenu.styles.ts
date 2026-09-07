import styled from 'styled-components';

export const ToggleRow = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  background: ${(props) => (props.$active ? 'var(--color-surface)' : 'transparent')};
  color: var(--color-ivory);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: pointer;
  font-family: inherit;
  font-size: var(--font-size-base);
  text-align: left;

  &:hover {
    border-color: var(--color-gold);
  }
`;

export const VolumeRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
`;

export const VolumeLabel = styled.span<{ $disabled: boolean }>`
  font-size: var(--font-size-sm);
  color: ${(props) => (props.$disabled ? 'var(--color-text-muted)' : 'var(--color-gold)')};
`;

/** Short, not a full-width slider — see SettingsMenu.tsx. */
export const VolumeSlider = styled.input`
  width: 120px;
  accent-color: var(--color-gold);

  &:disabled {
    accent-color: var(--color-text-muted);
    opacity: 0.5;
  }
`;
