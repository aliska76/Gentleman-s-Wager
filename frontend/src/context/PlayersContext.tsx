import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { LoginResponse } from '../types/auth';
import { readStorageItem, writeStorageItem } from '../utils/storage.utils';

export type PlayerSession = LoginResponse;

const PLAYER1_KEY = 'roeto:player1';
const PLAYER2_KEY = 'roeto:player2';

/**
 * Both players' sessions are persisted to localStorage (the assignment's
 * "persist data" extra) so a page reload doesn't kick everyone back to the
 * login screen mid-session — a reload is otherwise indistinguishable from a
 * fresh visit, which is especially disruptive here since both players are
 * simulated on this one page/session. The underlying read/write is shared
 * with App.tsx and SoundContext via utils/storage.utils.ts (localStorage
 * can throw — private browsing, disabled, quota — so persistence is a
 * convenience on top of in-memory state, not a requirement, and falls
 * back silently); JSON parsing is specific to this file, so it stays here.
 */
function readStoredSession(key: string): PlayerSession | null {
  const raw = readStorageItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PlayerSession;
  } catch {
    return null;
  }
}

function writeStoredSession(key: string, session: PlayerSession | null): void {
  writeStorageItem(key, session ? JSON.stringify(session) : null);
}

interface PlayersContextValue {
  player1: PlayerSession | null;
  player2: PlayerSession | null;
  setPlayer1: (session: PlayerSession) => void;
  setPlayer2: (session: PlayerSession) => void;
  /** Clears both players — used by "New player" (logging in as someone else). */
  reset: () => void;
  /**
   * The whole reason both sessions live in one context: given whichever
   * userId the current game says it's the turn of, find that player's
   * token so the next API call is signed with the right one. Per the
   * assignment brief, both players are simulated on this one page/session
   * — there's no second browser to hold the other token.
   */
  sessionForUserId: (userId: string) => PlayerSession | null;
}

const PlayersContext = createContext<PlayersContextValue | null>(null);

export function PlayersProvider({ children }: { children: ReactNode }) {
  const [player1, setPlayer1State] = useState<PlayerSession | null>(() => readStoredSession(PLAYER1_KEY));
  const [player2, setPlayer2State] = useState<PlayerSession | null>(() => readStoredSession(PLAYER2_KEY));

  const setPlayer1 = useCallback((session: PlayerSession) => {
    setPlayer1State(session);
    writeStoredSession(PLAYER1_KEY, session);
  }, []);

  const setPlayer2 = useCallback((session: PlayerSession) => {
    setPlayer2State(session);
    writeStoredSession(PLAYER2_KEY, session);
  }, []);

  const reset = useCallback(() => {
    setPlayer1State(null);
    setPlayer2State(null);
    writeStoredSession(PLAYER1_KEY, null);
    writeStoredSession(PLAYER2_KEY, null);
  }, []);

  const sessionForUserId = useCallback(
    (userId: string): PlayerSession | null => {
      if (player1?.userId === userId) return player1;
      if (player2?.userId === userId) return player2;
      return null;
    },
    [player1, player2],
  );

  const value = useMemo(
    () => ({ player1, player2, setPlayer1, setPlayer2, reset, sessionForUserId }),
    [player1, player2, setPlayer1, setPlayer2, reset, sessionForUserId],
  );

  return <PlayersContext.Provider value={value}>{children}</PlayersContext.Provider>;
}

export function usePlayers(): PlayersContextValue {
  const ctx = useContext(PlayersContext);
  if (!ctx) throw new Error('usePlayers() must be used within a <PlayersProvider>');
  return ctx;
}
