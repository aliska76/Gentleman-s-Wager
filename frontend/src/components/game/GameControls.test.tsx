import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameControls } from './GameControls';

describe('GameControls', () => {
  it('disables both buttons when canAct is false', () => {
    render(<GameControls canAct={false} isPending={false} onRoll={vi.fn()} onHold={vi.fn()} />);

    expect(screen.getByText('Roll')).toBeDisabled();
    expect(screen.getByText('Hold')).toBeDisabled();
  });

  it('disables both buttons while a request is pending, even if canAct is true', () => {
    render(<GameControls canAct={true} isPending={true} onRoll={vi.fn()} onHold={vi.fn()} />);

    expect(screen.getByText('Roll')).toBeDisabled();
    expect(screen.getByText('Hold')).toBeDisabled();
  });

  it('calls onRoll / onHold when enabled and clicked', () => {
    const onRoll = vi.fn();
    const onHold = vi.fn();
    render(<GameControls canAct={true} isPending={false} onRoll={onRoll} onHold={onHold} />);

    fireEvent.click(screen.getByText('Roll'));
    fireEvent.click(screen.getByText('Hold'));

    expect(onRoll).toHaveBeenCalledTimes(1);
    expect(onHold).toHaveBeenCalledTimes(1);
  });
});
