import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from '../../application/users.service';
import { AuthenticatedUser, JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { LeaderboardQueryDto } from './dto/leaderboard-query.dto';

@ApiTags('users')
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('users/me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: "Current user's profile (win count, etc.)" })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getProfile(user.userId);
  }

  @Get('users/bot')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'The computer opponent\'s profile (userId, etc.)',
    description: 'Use the returned id as opponentUserId in POST /games to start a game against the computer — game creation has no separate "vs bot" path. 404 if `npx prisma db seed` has not been run yet.',
  })
  botOpponent() {
    return this.usersService.getBotOpponent();
  }

  @Get('leaderboard')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Top players by win count, paginated',
    description:
      'Cache-aside with a short TTL (see ARCHITECTURE.md §9) — invalidated on every win, otherwise served from cache. ' +
      'Response is `{ data: UserProfile[], meta: { limit, total } }`; `total` is the total number of players, not just this page.',
  })
  leaderboard(@Query() query: LeaderboardQueryDto) {
    return this.usersService.getLeaderboard(query.limit, query.offset);
  }
}
