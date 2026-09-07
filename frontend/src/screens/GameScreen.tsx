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
import { ErrorText, FinishedActions, Screen, TargetScore } from './GameScreen.styles';
import { useSound } from '../sound/SoundContext';

interface GameScreenProps {
  /**
   * Owned by the parent (App), not this component — so switching to the
   * leaderboard and back doesn't remount this screen and lose progress
   * back to whatever state the game was in when it started.
   */
  game: GameState;
  onGameChange: (game: GameState) => void;
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
// Gives the roll sound (capped to its first second, see soundLibrary.ts)
// a bit of a head start before the win/lose sound comes in, instead of the
// two starting at literally the same instant when a Hold ends the game
// right after a roll. Short on purpose — this isn't meant to wait out the
// whole roll clip, just soften the transition.
const GAME_OVER_SOUND_DELAY_MS = 350;

export function GameScreen({ game, onGameChange, className }: GameScreenProps) {
  const { player1, player2, sessionForUserId } = usePlayers();
  const { playSfx } = useSound();
  const [lastRoll, setLastRoll] = useState<{ dice: [number, number]; busted: boolean; rollId: number } | null>(
    null,
  );
  const [bustPauseActive, setBustPauseActive] = useState(false);
  const botTurnInFlight = useRef(false);
  // Roll/Hold are disabled via `isPending` once React re-renders, but that
  // re-render isn't synchronous with the click — a fast double-click (or a
  // held-down Enter key) can fire a second roll before the first one's
  // `isPending` has actually disabled the button. Two in-flight rolls can
  // then resolve out of order, and since onGameChange/registerRoll just
  // overwrite state with whichever response arrives last, an earlier
  // non-bust roll's response landing after a later bust's would silently
  // undo the bust's turn-pass — the dice/"Bust!" message would show the
  // bust, but game.currentPlayerId (and therefore whose turn it looks
  // like) would revert to the pre-bust player. This ref closes that
  // window immediately on click, before React re-renders at all.
  const actionInFlight = useRef(false);
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

  function registerRoll(dice: [number, number], busted: boolean, isHuman: boolean) {
    rollIdRef.current += 1;
    setLastRoll({ dice, busted, rollId: rollIdRef.current });
    if (busted) {
      setBustPauseActive(true);
      if (bustPauseTimer.current) clearTimeout(bustPauseTimer.current);
      bustPauseTimer.current = setTimeout(() => setBustPauseActive(false), BUST_PAUSE_MS);
      // The "sad crowd sigh" is only for a human's bust — the bot already
      // gets its own tell (the assignment's 6 & 6 action-lock/message) and
      // doesn't need a sound on top of it.
      if (isHuman) playSfx('bust');
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
              registerRoll(result.dice, Boolean(result.busted), false);
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

  // Win/lose sound. 'win' plays whenever anyone wins, human or AI
  // opponent alike; 'lose' only plays when the bot is specifically the
  // winner (i.e. a human lost to the AI) — losing to another human on the
  // same page doesn't get the sad-crowd sound. Keyed on game.status/game.id
  // rather than including botQuery.data/playSfx (same reasoning as the
  // bot-turn effect above) so this fires exactly once per finished game
  // instance, not on every incidental re-render.
  useEffect(() => {
    if (game.status !== 'FINISHED' || !botQuery.data) return;
    const winnerIsBot = game.winnerId === botQuery.data.id;
    const key = winnerIsBot ? 'lose' : 'win';
    const timer = setTimeout(() => playSfx(key), GAME_OVER_SOUND_DELAY_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.status, game.id]);

  function handleRoll() {
    if (!activeSession || actionInFlight.current) return;
    actionInFlight.current = true;
    // Fired on the click itself, not gated on the request succeeding —
    // this is only ever reached for a human's own roll (the bot's rolls go
    // through the separate botTurnMutation above), matching "roll sound,
    // but not when AI rolls".
    playSfx('roll');
    rollMutation.mutate(
      { token: activeSession.token, gameId: game.id },
      {
        onSuccess: (outcome) => {
          onGameChange(outcome.state);
          registerRoll(outcome.dice, outcome.busted, true);
        },
        onSettled: () => {
          actionInFlight.current = false;
        },
      },
    );
  }

  function handleHold() {
    if (!activeSession || actionInFlight.current) return;
    actionInFlight.current = true;
    holdMutation.mutate(
      { token: activeSession.token, gameId: game.id },
      {
        onSuccess: onGameChange,
        onSettled: () => {
          actionInFlight.current = false;
        },
      },
    );
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
      <TargetScore data-testid="target-score">First to {game.winningScore}</TargetScore>
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
        </FinishedActions>
      )}

      {activeError && <ErrorText data-testid="game-screen-error">{activeError.message}</ErrorText>}
    </Screen>
  );
}
