import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PlayersProvider, usePlayers } from './PlayersContext';

function wrapper({ children }: { children: ReactNode }) {
  return <PlayersProvider>{children}</PlayersProvider>;
}

const player1Session = { token: 't1', userId: 'u1', username: 'edmund' };
const player2Session = { token: 't2', userId: 'u2', username: 'mildred' };

describe('PlayersContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with no players when localStorage is empty', () => {
    const { result } = renderHook(() => usePlayers(), { wrapper });

    expect(result.current.player1).toBeNull();
    expect(result.current.player2).toBeNull();
  });

  it('persists a logged-in player to localStorage and restores it on the next mount', () => {
    const { result } = renderHook(() => usePlayers(), { wrapper });

    act(() => result.current.setPlayer1(player1Session));

    expect(JSON.parse(localStorage.getItem('roeto:player1') ?? 'null')).toEqual(player1Session);

    // Simulates a page reload: a fresh provider instance should pick the session back up.
    const { result: afterReload } = renderHook(() => usePlayers(), { wrapper });
    expect(afterReload.current.player1).toEqual(player1Session);
  });

  it('reset() clears both players from state and localStorage', () => {
    const { result } = renderHook(() => usePlayers(), { wrapper });

    act(() => {
      result.current.setPlayer1(player1Session);
      result.current.setPlayer2(player2Session);
    });
    act(() => result.current.reset());

    expect(result.current.player1).toBeNull();
    expect(result.current.player2).toBeNull();
    expect(localStorage.getItem('roeto:player1')).toBeNull();
    expect(localStorage.getItem('roeto:player2')).toBeNull();
  });
});
