import { Button } from '../common/Button.styles';
import { Controls } from './PaginationControls.styles';

interface PaginationControlsProps {
  limit: number;
  offset: number;
  total: number;
  onPageChange: (newOffset: number) => void;
  className?: string;
}

export function PaginationControls({ limit, offset, total, onPageChange, className }: PaginationControlsProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <Controls className={className} data-testid="pagination-controls">
      <Button data-testid="pagination-previous" onClick={() => onPageChange(Math.max(0, offset - limit))} disabled={offset === 0}>
        Previous
      </Button>
      <span data-testid="pagination-page-info">
        Page {currentPage} of {totalPages}
      </span>
      <Button data-testid="pagination-next" onClick={() => onPageChange(offset + limit)} disabled={offset + limit >= total}>
        Next
      </Button>
    </Controls>
  );
}
