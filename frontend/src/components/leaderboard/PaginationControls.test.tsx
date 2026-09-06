import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaginationControls } from './PaginationControls';

describe('PaginationControls', () => {
  it('disables Previous on the first page and Next on the last page', () => {
    render(<PaginationControls limit={10} offset={0} total={10} onPageChange={vi.fn()} />);

    expect(screen.getByText('Previous')).toBeDisabled();
    expect(screen.getByText('Next')).toBeDisabled();
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
  });

  it('calls onPageChange with the next offset', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls limit={10} offset={0} total={25} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText('Next'));

    expect(onPageChange).toHaveBeenCalledWith(10);
  });

  it('calls onPageChange with the previous offset, never going below 0', () => {
    const onPageChange = vi.fn();
    render(<PaginationControls limit={10} offset={10} total={25} onPageChange={onPageChange} />);

    fireEvent.click(screen.getByText('Previous'));

    expect(onPageChange).toHaveBeenCalledWith(0);
  });
});
