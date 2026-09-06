import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LeaderboardScreen } from './LeaderboardScreen';
import { usePlayers } from '../context/PlayersContext';
import * as usersApi from '../api/users';
import type { PaginatedResult, UserProfile } from '../types/user';

vi.mock('../context/PlayersContext', () => ({
  usePlayers: vi.fn(),
}));

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <LeaderboardScreen />
    </QueryClientProvider>,
  );
}

function mockPlayers(player1: { token: string; userId: string; username: string } | null) {
  vi.mocked(usePlayers).mockReturnValue({
    player1,
    player2: null,
    setPlayer1: vi.fn(),
    setPlayer2: vi.fn(),
    reset: vi.fn(),
    sessionForUserId: vi.fn().mockReturnValue(null),
  });
}

const players: UserProfile[] = [
  { id: 'u1', username: 'edmund', wins: 4, avatarId: 1, isBot: false },
  { id: 'bot1', username: 'AI', wins: 2, avatarId: 2, isBot: true },
];
const page: PaginatedResult<UserProfile> = { data: players, meta: { limit: 10, total: 2 } };

describe('LeaderboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('asks the visitor to log in first when nobody is logged in', () => {
    mockPlayers(null);

    renderWithClient();

    expect(screen.getByTestId('leaderboard-screen')).toBeInTheDocument();
    expect(screen.getByTestId('leaderboard-login-required')).toBeInTheDocument();
  });

  it('shows the leaderboard table once the data loads', async () => {
    vi.spyOn(usersApi, 'getLeaderboard').mockResolvedValue(page);
    mockPlayers({ token: 't1', userId: 'u1', username: 'edmund' });

    renderWithClient();

    expect(screen.getByTestId('leaderboard-loading')).toBeInTheDocument();
    await screen.findByTestId('leaderboard-table');

    expect(screen.getAllByTestId('leaderboard-row')).toHaveLength(2);
    expect(usersApi.getLeaderboard).toHaveBeenCalledWith('t1', 10, 0);
  });

  it('shows an error message when the request fails', async () => {
    vi.spyOn(usersApi, 'getLeaderboard').mockRejectedValue(new Error('Request failed with status 500'));
    mockPlayers({ token: 't1', userId: 'u1', username: 'edmund' });

    renderWithClient();

    expect(await screen.findByTestId('leaderboard-error')).toHaveTextContent('Request failed with status 500');
  });
});
