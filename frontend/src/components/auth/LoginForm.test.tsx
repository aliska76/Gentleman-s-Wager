import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginForm } from './LoginForm';
import * as authApi from '../../api/auth';

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('LoginForm', () => {
  it('calls onSuccess with the login response once submitted', async () => {
    const session = { token: 't', userId: 'u1', username: 'edmund' };
    vi.spyOn(authApi, 'login').mockResolvedValue(session);
    const onSuccess = vi.fn();

    renderWithClient(<LoginForm label="Player 1" onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('Player 1'), { target: { value: 'edmund' } });
    fireEvent.click(screen.getByText('Continue'));

    await waitFor(() => expect(onSuccess.mock.calls[0]?.[0]).toEqual(session));
    expect(authApi.login).toHaveBeenCalledWith('edmund');
  });

  it('shows the error message when login fails', async () => {
    vi.spyOn(authApi, 'login').mockRejectedValue(new Error('Request failed with status 500'));

    renderWithClient(<LoginForm label="Player 1" onSuccess={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Player 1'), { target: { value: 'edmund' } });
    fireEvent.click(screen.getByText('Continue'));

    expect(await screen.findByText('Request failed with status 500')).toBeInTheDocument();
  });

  it('does not submit when the username is blank', () => {
    const loginSpy = vi.spyOn(authApi, 'login');

    renderWithClient(<LoginForm label="Player 1" onSuccess={vi.fn()} />);
    fireEvent.click(screen.getByText('Continue'));

    expect(loginSpy).not.toHaveBeenCalled();
  });
});
