import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LoginScreen } from './LoginScreen';
import { usePlayers } from '../context/PlayersContext';
import * as gamesApi from '../api/games';
import * as usersApi from '../api/users';
import type { GameState } from '../types/game';
import type { UserProfile } from '../types/user';

vi.mock('../context/PlayersContext', () => ({
  usePlayers: vi.fn(),
}));

function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

function mockPlayers(overrides: Partial<ReturnType<typeof usePlayers>> = {}) {
  vi.mocked(usePlayers).mockReturnValue({
    player1: null,
    player2: null,
    setPlayer1: vi.fn(),
    setPlayer2: vi.fn(),
    reset: vi.fn(),
    sessionForUserId: vi.fn().mockReturnValue(null),
    ...overrides,
  });
}

const player1 = { token: 't1', userId: 'u1', username: 'edmund' };
const bot: UserProfile = { id: 'bot1', username: 'AI', wins: 5, avatarId: 1, isBot: true };
const createdGame: GameState = {
  id: 'g1',
  player1Id: 'u1',
  player2Id: 'bot1',
  winningScore: 100,
  status: 'IN_PROGRESS',
  winnerId: null,
  currentPlayerId: 'u1',
  score1: 0,
  score2: 0,
  roundScore: 0,
};

describe('LoginScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the Player 1 login form first', () => {
    mockPlayers();

    renderWithClient(<LoginScreen onGameStart={vi.fn()} />);

    expect(screen.getByTestId('login-screen')).toBeInTheDocument();
    expect(screen.getByLabelText('Player 1')).toBeInTheDocument();
  });

  it('offers an opponent choice once Player 1 is logged in, then a second login form for a human opponent', () => {
    vi.spyOn(usersApi, 'getBotOpponent').mockResolvedValue(bot);
    mockPlayers({ player1 });

    renderWithClient(<LoginScreen onGameStart={vi.fn()} />);

    expect(screen.getByText(/Welcome, edmund/)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('choose-human-button'));

    expect(screen.getByLabelText('Player 2')).toBeInTheDocument();
  });

  it('starts a game against the bot and reports it via onGameStart', async () => {
    vi.spyOn(usersApi, 'getBotOpponent').mockResolvedValue(bot);
    vi.spyOn(gamesApi, 'createGame').mockResolvedValue(createdGame);
    mockPlayers({ player1 });
    const onGameStart = vi.fn();

    renderWithClient(<LoginScreen onGameStart={onGameStart} />);
    fireEvent.click(screen.getByTestId('choose-bot-button'));

    await screen.findByText(`${player1.username} vs ${bot.username}`);
    fireEvent.click(screen.getByTestId('start-game-button'));

    // onSuccess here is React Query's per-call mutate() callback, invoked as
    // (data, variables, context) — assert on the first argument only.
    await waitFor(() => expect(onGameStart.mock.calls[0]?.[0]).toEqual(createdGame));
    expect(gamesApi.createGame).toHaveBeenCalledWith(player1.token, bot.id, undefined);
  });
});
