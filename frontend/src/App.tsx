import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PlayersProvider, usePlayers } from './context/PlayersContext';
import { LoginScreen } from './screens/LoginScreen';
import { GameScreen } from './screens/GameScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { Button } from './components/common/Button.styles';
import { Heading1 } from './components/common/Typography.styles';
import { GlobalStyles } from './theme/GlobalStyles.styles';
import { useGame } from './api/useGames';
import type { GameState } from './types/game';
import { Brand, Header, Logo, Main, MenuButton, MenuWrapper, Nav, Shell } from './App.styles';
import logo from './assets/logo.png';

const queryClient = new QueryClient();

type View = 'lobby' | 'game' | 'leaderboard';

/**
 * Just the active game's id, not its full state — the state itself always
 * comes fresh from the server (via useGame) rather than trusting a
 * possibly-stale snapshot left over from before a reload.
 */
const ACTIVE_GAME_ID_KEY = 'roeto:activeGameId';

function readStoredGameId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_GAME_ID_KEY);
  } catch {
    return null;
  }
}

function writeStoredGameId(gameId: string | null): void {
  try {
    if (gameId) localStorage.setItem(ACTIVE_GAME_ID_KEY, gameId);
    else localStorage.removeItem(ACTIVE_GAME_ID_KEY);
  } catch {
    // Persistence is best-effort — see PlayersContext's comment for why.
  }
}

function AppShell() {
  const [view, setView] = useState<View>('lobby');
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [restoredGameId] = useState(readStoredGameId);
  const { player1, reset } = usePlayers();

  // Re-fetches the persisted game id fresh from the server on first mount —
  // never trusts a locally-cached copy of game state — so a reload while a
  // game is in progress lands back on that game instead of a fresh lobby.
  const restoreQuery = useGame(player1?.token ?? null, activeGame ? null : restoredGameId);
  useEffect(() => {
    if (restoreQuery.data) {
      setActiveGame(restoreQuery.data);
      setView('game');
    }
  }, [restoreQuery.data]);
  useEffect(() => {
    // The restorable game is gone (finished and evicted, wrong owner, etc.)
    // — drop the stale id so we don't keep retrying it on every reload.
    if (restoreQuery.isError) writeStoredGameId(null);
  }, [restoreQuery.isError]);

  function updateActiveGame(game: GameState | null) {
    setActiveGame(game);
    writeStoredGameId(game?.id ?? null);
  }

  function handleGameStart(game: GameState) {
    updateActiveGame(game);
    setView('game');
  }

  /** Back to the lobby for a new game — keeps whoever is already logged in logged in. */
  function handleNewGame() {
    updateActiveGame(null);
    setView('lobby');
  }

  /** Actually switch identities — clears both logged-in sessions. */
  function handleNewPlayer() {
    reset();
    updateActiveGame(null);
    setView('lobby');
  }

  return (
    <Shell data-testid="app-shell">
      <Header data-testid="app-header">
        <Brand>
          <Logo src={logo} alt="" data-testid="app-logo" />
          <Heading1>Gentleman&rsquo;s Wager</Heading1>
        </Brand>
        {player1 && (
          <MenuWrapper>
            <MenuButton type="button" aria-label="Menu" data-testid="nav-menu-button">
              <span />
              <span />
              <span />
              <span />
            </MenuButton>
            <Nav data-testid="app-nav">
              <Button data-testid="nav-leaderboard-button" onClick={() => setView('leaderboard')}>Leaderboard</Button>
              {activeGame && (
                <Button data-testid="nav-current-game-button" onClick={() => setView('game')}>Current game</Button>
              )}
              <Button data-testid="nav-new-game-button" onClick={handleNewGame}>New game</Button>
              <Button data-testid="nav-new-player-button" onClick={handleNewPlayer}>New player</Button>
            </Nav>
          </MenuWrapper>
        )}
      </Header>

      <Main data-testid="app-main">
        {view === 'lobby' && <LoginScreen onGameStart={handleGameStart} />}
        {view === 'game' && activeGame && (
          <GameScreen game={activeGame} onGameChange={updateActiveGame} />
        )}
        {view === 'leaderboard' && <LeaderboardScreen />}
      </Main>
    </Shell>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PlayersProvider>
        <GlobalStyles />
        <AppShell />
      </PlayersProvider>
    </QueryClientProvider>
  );
}
