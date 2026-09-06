import { useState } from 'react';
import { usePlayers } from '../context/PlayersContext';
import { LoginForm } from '../components/auth/LoginForm';
import { Button } from '../components/common/Button.styles';
import { Heading2, Text } from '../components/common/Typography.styles';
import { useBotOpponent } from '../api/useUsers';
import { useCreateGame } from '../api/useGames';
import type { GameState } from '../types/game';
import { Choices, ErrorText, Screen, ScoreLabel } from './LoginScreen.styles';

type OpponentChoice = 'bot' | 'human' | null;

interface LoginScreenProps {
  onGameStart: (game: GameState) => void;
  className?: string;
}

/**
 * Per the assignment brief, both players are simulated on this one page —
 * there's no second browser. So this screen collects up to two logins
 * (Player 1 always; Player 2 only if "another player" is chosen) and
 * holds both sessions in PlayersContext before starting a game.
 */
export function LoginScreen({ onGameStart, className }: LoginScreenProps) {
  const { player1, player2, setPlayer1, setPlayer2 } = usePlayers();
  const [opponentChoice, setOpponentChoice] = useState<OpponentChoice>(null);
  const [winningScore, setWinningScore] = useState('');

  const botQuery = useBotOpponent(player1?.token ?? null);
  const createGameMutation = useCreateGame();

  const opponentUserId = opponentChoice === 'bot' ? botQuery.data?.id : player2?.userId;
  const opponentLabel = opponentChoice === 'bot' ? botQuery.data?.username : player2?.username;
  const readyToStart = Boolean(player1 && opponentUserId);

  function handleStartGame() {
    if (!player1 || !opponentUserId) return;
    const parsed = winningScore.trim() ? Number(winningScore) : undefined;
    createGameMutation.mutate(
      { token: player1.token, opponentUserId, winningScore: parsed },
      { onSuccess: onGameStart },
    );
  }

  if (!player1) {
    return (
      <Screen className={className} data-testid="login-screen">
        <Heading2>Gentleman&rsquo;s Wager</Heading2>
        <LoginForm label="Player 1" onSuccess={setPlayer1} />
      </Screen>
    );
  }

  if (!opponentChoice) {
    return (
      <Screen className={className} data-testid="login-screen">
        <Heading2>Welcome, {player1.username}</Heading2>
        <Text>Who is your opponent?</Text>
        <Choices>
          <Button data-testid="choose-bot-button" onClick={() => setOpponentChoice('bot')}>
            AI opponent
          </Button>
          <Button data-testid="choose-human-button" onClick={() => setOpponentChoice('human')}>
            Another player
          </Button>
        </Choices>
      </Screen>
    );
  }

  if (opponentChoice === 'human' && !player2) {
    return (
      <Screen className={className} data-testid="login-screen">
        <Heading2>Second player</Heading2>
        <LoginForm label="Player 2" onSuccess={setPlayer2} />
      </Screen>
    );
  }

  return (
    <Screen className={className} data-testid="login-screen">
      <Heading2>Ready to play</Heading2>
      <Text>
        {player1.username} vs {opponentLabel ?? '…'}
      </Text>
      <ScoreLabel htmlFor="winning-score">Winning score (optional, default 100)</ScoreLabel>
      <input
        id="winning-score"
        data-testid="winning-score-input"
        type="number"
        min={1}
        value={winningScore}
        onChange={(e) => setWinningScore(e.target.value)}
        placeholder="100"
      />
      <Button
        data-testid="start-game-button"
        onClick={handleStartGame}
        disabled={!readyToStart || createGameMutation.isPending}
      >
        {createGameMutation.isPending ? 'Starting…' : 'Start game'}
      </Button>
      {createGameMutation.isError && (
        <ErrorText data-testid="start-game-error">{createGameMutation.error.message}</ErrorText>
      )}
    </Screen>
  );
}
