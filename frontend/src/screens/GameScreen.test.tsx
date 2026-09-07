import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GameScreen } from './GameScreen';
import { usePlayers } from '../context/PlayersContext';
import { useSound } from '../sound/SoundContext';
import * as gamesApi from '../api/games';
import * as usersApi from '../api/users';
import type { GameState } from '../types/game';
import type { UserProfile } from '../types/user';

vi.mock('../context/PlayersContext', () => ({
  usePlayers: vi.fn(),
}));

vi.mock('../sound/SoundContext', () => ({
  useSound: vi.fn(),
}));

// Mirrors GameScreen's own BOT_STEP_DELAY_MS — kept in sync with a comment
// there rather than exported, since it's an internal pacing detail.
const BOT_STEP_DELAY_MS = 700;

const player1 = { token: 't1', userId: 'u1', username: 'edmund' };
const player2 = { token: 't2', userId: 'u2', username: 'mildred' };
const bot: UserProfile = { id: 'bot1', username: 'AI', wins: 1, avatarId: 3, isBot: true };

function newClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function renderGame(game: GameState, handlers: { onGameChange?: (g: GameState) => void } = {}) {
  return render(
    <QueryClientProvider client={newClient()}>
      <GameScreen game={game} onGameChange={handlers.onGameChange ?? vi.fn()} />
    </QueryClientProvider>,
  );
}

function mockPlayers(overrides: Partial<ReturnType<typeof usePlayers>> = {}) {
  vi.mocked(usePlayers).mockReturnValue({
    player1,
    player2: null,
    setPlayer1: vi.fn(),
    setPlayer2: vi.fn(),
    reset: vi.fn(),
    sessionForUserId: vi.fn().mockReturnValue(null),
    ...overrides,
  });
}

function baseGame(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'g1',
    player1Id: 'u1',
    player2Id: 'u2',
    winningScore: 100,
    status: 'IN_PROGRESS',
    winnerId: null,
    currentPlayerId: 'u1',
    score1: 0,
    score2: 0,
    roundScore: 0,
    ...overrides,
  };
}

describe('GameScreen', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(usersApi, 'getBotOpponent').mockResolvedValue(bot);
    // Sound is a side effect the tests don't assert on here — a plain
    // no-op stub keeps every existing test unconcerned with it, same as
    // mocking usePlayers.
    vi.mocked(useSound).mockReturnValue({
      musicOn: false,
      sfxOn: true,
      volume: 0.6,
      toggleMusic: vi.fn(),
      toggleSfx: vi.fn(),
      setVolume: vi.fn(),
      playSfx: vi.fn(),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets the active player roll and reports the updated state', async () => {
    mockPlayers({ sessionForUserId: vi.fn((userId: string) => (userId === player1.userId ? player1 : null)) });
    const rolledState = baseGame({ score1: 7, roundScore: 7 });
    vi.spyOn(gamesApi, 'roll').mockResolvedValue({ dice: [3, 4], busted: false, state: rolledState });
    const onGameChange = vi.fn();

    renderGame(baseGame({ currentPlayerId: player1.userId }), { onGameChange });
    expect(screen.getByTestId('roll-button')).not.toBeDisabled();
    expect(screen.getByTestId('target-score')).toHaveTextContent('100');

    fireEvent.click(screen.getByTestId('roll-button'));

    await waitFor(() => expect(onGameChange).toHaveBeenCalledWith(rolledState));
    expect(gamesApi.roll).toHaveBeenCalledWith(player1.token, 'g1');
  });

  it("auto-drives the bot's turn one step at a time, on player1's token", async () => {
    vi.useFakeTimers();
    mockPlayers({ sessionForUserId: vi.fn().mockReturnValue(null) });
    const afterBotRoll = baseGame({ currentPlayerId: bot.id });
    vi.spyOn(gamesApi, 'botTurn').mockResolvedValue({ action: 'roll', dice: [5, 6], busted: false, state: afterBotRoll });
    const onGameChange = vi.fn();

    renderGame(baseGame({ currentPlayerId: bot.id }), { onGameChange });

    expect(gamesApi.botTurn).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(BOT_STEP_DELAY_MS);
    });

    expect(gamesApi.botTurn).toHaveBeenCalledTimes(1);
    expect(gamesApi.botTurn).toHaveBeenCalledWith(player1.token, 'g1');
    expect(onGameChange).toHaveBeenCalledWith(afterBotRoll);
  });

  it('shows rematch once finished, and it starts a fresh game', async () => {
    mockPlayers({ sessionForUserId: vi.fn().mockReturnValue(null) });
    const rematchState = baseGame({ status: 'IN_PROGRESS' });
    vi.spyOn(gamesApi, 'newGame').mockResolvedValue(rematchState);
    const onGameChange = vi.fn();

    renderGame(baseGame({ status: 'FINISHED', winnerId: player1.userId }), { onGameChange });

    expect(screen.getByTestId('game-finished-actions')).toBeInTheDocument();
    expect(screen.queryByTestId('game-controls')).not.toBeInTheDocument();
    expect(screen.queryByTestId('back-to-lobby-button')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('rematch-button'));
    await waitFor(() => expect(onGameChange).toHaveBeenCalledWith(rematchState));
    expect(gamesApi.newGame).toHaveBeenCalledWith(player1.token, 'g1', undefined);
  });

  it('lets a player abandon an in-progress game via Restart', async () => {
    mockPlayers({ sessionForUserId: vi.fn((userId: string) => (userId === player1.userId ? player1 : null)) });
    const freshState = baseGame({ id: 'g2' });
    vi.spyOn(gamesApi, 'newGame').mockResolvedValue(freshState);
    const onGameChange = vi.fn();

    renderGame(baseGame({ currentPlayerId: player1.userId }), { onGameChange });

    expect(screen.getByTestId('restart-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('restart-button'));

    await waitFor(() => expect(onGameChange).toHaveBeenCalledWith(freshState));
    expect(gamesApi.newGame).toHaveBeenCalledWith(player1.token, 'g1', undefined);
  });

  it("keeps controls disabled for a brief pause after a 6 & 6 bust, even for a next player who's already logged in", async () => {
    mockPlayers({
      player2,
      sessionForUserId: vi.fn((userId: string) => {
        if (userId === player1.userId) return player1;
        if (userId === player2.userId) return player2;
        return null;
      }),
    });
    const bustedState = baseGame({ currentPlayerId: player2.userId, roundScore: 0 });
    vi.spyOn(gamesApi, 'roll').mockResolvedValue({ dice: [6, 6], busted: true, state: bustedState });

    function Harness() {
      const [game, setGame] = useState<GameState>(baseGame({ currentPlayerId: player1.userId }));
      return <GameScreen game={game} onGameChange={setGame} />;
    }

    render(
      <QueryClientProvider client={newClient()}>
        <Harness />
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByTestId('roll-button'));

    expect(await screen.findByTestId('dice-tray-bust-label')).toBeInTheDocument();
    // It's now player2's turn, and player2 is already logged in on this
    // page — without the brief bust pause, canAct would already be true.
    expect(screen.getByTestId('roll-button')).toBeDisabled();

    await waitFor(() => expect(screen.getByTestId('roll-button')).not.toBeDisabled(), { timeout: 2000 });
  });
});
