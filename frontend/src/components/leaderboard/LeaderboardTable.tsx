import type { UserProfile } from '../../types/user';
import { Table, Td, Th } from './LeaderboardTable.styles';

interface LeaderboardTableProps {
  players: UserProfile[];
  /** So ranks keep counting up correctly on page 2, 3, etc. */
  rankOffset: number;
  className?: string;
}

export function LeaderboardTable({ players, rankOffset, className }: LeaderboardTableProps) {
  return (
    <Table className={className} data-testid="leaderboard-table">
      <thead>
        <tr>
          <Th>#</Th>
          <Th>Player</Th>
          <Th>Wins</Th>
        </tr>
      </thead>
      <tbody>
        {players.map((player, i) => (
          <tr key={player.id} data-testid="leaderboard-row">
            <Td>{rankOffset + i + 1}</Td>
            <Td>
              {player.username}
              {player.isBot ? ' croupier' : ''}
            </Td>
            <Td>{player.wins}</Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
