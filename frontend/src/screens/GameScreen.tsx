import { useEffect, useRef, useState } from 'react';
import { usePlayers } from '../context/PlayersContext';
import type { GameState } from '../types/game';
import { useBotTurn, useHold, useNewGame, useRoll } from '../api/useGames';
import { useBotOpponent } from '../api/useUsers';
import { ScoreBoard } from '../components/game/ScoreBoard';
import { TurnIndicator } from '../components/game/TurnIndicator';
import { GameControls } from '../components/game/GameControls';
import { DiceTray } from '../components/dice/DiceTray';
import { Button } from '../components/common/Button.styles';
import { ErrorText, FinishedActions, Screen } from './GameScreen.styles';

interface GameScreenProps {
  /**
   * Owned by the parent (App), not this component — so switching to the
   * leaderboard and back doesn't remount this screen and lose progress
   * back to whatever state the game was in when it started.
   */
  game: GameState;
  onGameChange: (game: GameState) => void;
  onExitToLobby: () => void;
  className?: string;
}

const BOT_STEP_DELAY_MS = 700;
/**
 * How long Roll/Hold stay disabled after a 6 & 6 bust, so the "Bust!"
 * message is legible before the next player can act — the assignment's
 * "disable actions briefly and show a message" extra, applied regardless
 * of whose turn it becomes next (matters most in the two-humans-on-one-page
 * setup, where the next player's session is already logged in and could
 * otherwise roll again immediately).
 */
const BUST_PAUSE_MS = 1200;

export function GameScreen({ game, onGameChange, onExitToLobby, className }: GameScreenProps) {
  const { player1, player2, sessionForUserId } = usePlayers();
  const [lastRoll, setLastRoll] = useState<{ dice: [number, number]; busted: boolean; rollId: number } | null>(
    null,
  );
  const [bustPauseActive, setBustPauseActive] = useState(false);
  const botTurnInFlight = useRef(false);
  const rollIdRef = useRef(0);
  const bustPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rollMutation = useRoll();
  const holdMutation = useHold();
  const botTurnMutation = useBotTurn();
  const newGameMutation = useNewGame();
  // player1 is always a real logged-in human (the one who created the
  // game), so its token is always valid for looking up who the bot is —
  // regardless of whether the bot ended up as player1Id or player2Id.
  const botQuery = useBotOpponent(player1?.token ?? null);

  const activeSession = sessionForUserId(game.currentPlayerId);
  const isBotTurn = game.status === 'IN_PROGRESS' && !activeSession;
  const canAct = game.status === 'IN_PROGRESS' && Boolean(activeSession) && !bustPauseActive;

  const player1Label = player1?.username ?? 'Player 1';
  const player2Label =
    game.player2Id === botQuery.data?.id ? (botQuery.data?.username ?? 'AI') : (player2?.username ?? 'Player 2');
  const currentPlayerLabel = game.currentPlayerId === game.player1Id ? player1Label : player2Label;

  function registerRoll(dice: [number, number], busted: boolean) {
    rollIdRef.current += 1;
    setLastRoll({ dice, busted, rollId: rollIdRef.current });
    if (busted) {
      setBustPauseActive(true);
      if (bustPauseTimer.current) clearTimeout(bustPauseTimer.current);
      bustPauseTimer.current = setTimeout(() => setBustPauseActive(false), BUST_PAUSE_MS);
    }
  }

  // Clears the pending bust-pause timer if the component unmounts (e.g.
  // navigating away) mid-pause, so it doesn't fire a state update on an
  // unmounted component.
  useEffect(() => {
    return () => {
      if (bustPauseTimer.current) clearTimeout(bustPauseTimer.current);
    };
  }, []);

  // Drives the bot one step (one roll, or a hold) at a time, with a short
  // pause so its moves are visible rather than instant — see
  // GamesController.botTurn's own doc comment for why it's one-step-per-call.
  // Depends on the whole `game` object (not just its id/currentPlayerId):
  // the bot can take several steps within the same turn (roll, roll again,
  // then hold) without currentPlayerId ever changing in between, so keying
  // off individual fields let this effect go stale mid-turn and the bot's
  // turn would stall forever on "thinking…" after its first step.
  useEffect(() => {
    if (!isBotTurn || botTurnInFlight.current || !player1) return;
    botTurnInFlight.current = true;
    const timer = setTimeout(() => {
      botTurnMutation.mutate(
        { token: player1.token, gameId: game.id },
        {
          onSuccess: (result) => {
            onGameChange(result.state);
            if (result.action === 'roll' && result.dice) {
              registerRoll(result.dice, Boolean(result.busted));
            }
          },
          onSettled: () => {
            botTurnInFlight.current = false;
          },
        },
      );
    }, BOT_STEP_DELAY_MS);
    return () => clearTimeout(timer);
    // botTurnMutation is intentionally omitted: react-query returns a new
    // mutation object every render, and this effect should only re-run
    // when the actual game state changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBotTurn, game, player1]);

  function handleRoll() {
    if (!activeSession) return;
    rollMutation.mutate(
      { token: activeSession.token, gameId: game.id },
      {
        onSuccess: (outcome) => {
          onGameChange(outcome.state);
          registerRoll(outcome.dice, outcome.busted);
        },
      },
    );
  }

  function handleHold() {
    if (!activeSession) return;
    holdMutation.mutate({ token: activeSession.token, gameId: game.id }, { onSuccess: onGameChange });
  }

  /** Backs both "Rematch" (after FINISHED) and "Restart" (mid-game) — same fresh-game call either way. */
  function handleRestart() {
    if (!player1) return;
    newGameMutation.mutate(
      { token: player1.token, gameId: game.id },
      {
        onSuccess: (newState) => {
          onGameChange(newState);
          setLastRoll(null);
          setBustPauseActive(false);
        },
      },
    );
  }

  const isPending = rollMutation.isPending || holdMutation.isPending;
  const activeError =
    rollMutation.error ?? holdMutation.error ?? botTurnMutation.error ?? newGameMutation.error ?? null;

  return (
    <Screen className={className} data-testid="game-screen">
      <ScoreBoard game={game} player1Label={player1Label} player2Label={player2Label} />
      <TurnIndicator game={game} currentPlayerLabel={currentPlayerLabel} isBotThinking={isBotTurn} />
      <DiceTray dice={lastRoll?.dice ?? null} busted={lastRoll?.busted} rollId={lastRoll?.rollId} />

      {game.status === 'IN_PROGRESS' && (
        <>
          <GameControls canAct={canAct} isPending={isPending} onRoll={handleRoll} onHold={handleHold} />
          <Button data-testid="restart-button" onClick={handleRestart} disabled={newGameMutation.isPending}>
            {newGameMutation.isPending ? 'Restarting…' : 'Restart'}
          </Button>
        </>
      )}

      {game.status === 'FINISHED' && (
        <FinishedActions data-testid="game-finished-actions">
          <Button data-testid="rematch-button" onClick={handleRestart} disabled={newGameMutation.isPending}>
            {newGameMutation.isPending ? 'Starting…' : 'Rematch'}
          </Button>
          <Button data-testid="back-to-lobby-button" onClick={onExitToLobby}>Back to lobby</Button>
        </FinishedActions>
      )}

      {activeError && <ErrorText data-testid="game-screen-error">{activeError.message}</ErrorText>}
    </Screen>
  );
}
