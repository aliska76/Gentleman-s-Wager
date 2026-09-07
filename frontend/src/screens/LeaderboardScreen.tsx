import { useState } from 'react';
import { usePlayers } from '../context/PlayersContext';
import { useLeaderboard } from '../api/useUsers';
import { LeaderboardTable } from '../components/leaderboard/LeaderboardTable';
import { PaginationControls } from '../components/leaderboard/PaginationControls';
import { ErrorText, Heading2, Text } from '../components/common/Typography.styles';
import { Screen } from './LeaderboardScreen.styles';

const PAGE_SIZE = 10;

interface LeaderboardScreenProps {
  className?: string;
}

export function LeaderboardScreen({ className }: LeaderboardScreenProps) {
  const { player1 } = usePlayers();
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useLeaderboard(player1?.token ?? null, PAGE_SIZE, offset);

  if (!player1) {
    return (
      <Screen className={className} data-testid="leaderboard-screen">
        <Text data-testid="leaderboard-login-required">Log in first to see the leaderboard.</Text>
      </Screen>
    );
  }

  return (
    <Screen className={className} data-testid="leaderboard-screen">
      <Heading2>Leaderboard</Heading2>
      {isLoading && <Text data-testid="leaderboard-loading">Loading…</Text>}
      {isError && <ErrorText data-testid="leaderboard-error">{error.message}</ErrorText>}
      {data && (
        <>
          <LeaderboardTable players={data.data} rankOffset={offset} />
          <PaginationControls limit={data.meta.limit} offset={offset} total={data.meta.total} onPageChange={setOffset} />
        </>
      )}
    </Screen>
  );
}
