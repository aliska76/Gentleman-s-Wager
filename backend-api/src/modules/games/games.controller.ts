import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { GamesService } from '../../application/games.service';
import { AuthenticatedUser, JwtAuthGuard } from '../../common/jwt-auth.guard';
import { CurrentUser } from '../../common/current-user.decorator';
import { CreateGameDto } from './dto/create-game.dto';
import { NewGameDto } from './dto/new-game.dto';

// Same limit on all three in-turn actions (roll, hold, bot-turn): a single
// turn is a fast burst of calls, well above the app-wide default (30/60s).
const RAPID_TURN_THROTTLE = { default: { limit: 120, ttl: 60_000 } };

@ApiTags('games')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  @Post()
  @ApiOperation({
    summary: 'Start a new game against another user',
    description: 'To play against the computer, pass the id from GET /users/bot as opponentUserId — no separate "vs bot" mode.',
  })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGameDto) {
    return this.gamesService.createGame(user.userId, dto.opponentUserId, dto.winningScore);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch current game state (only visible to its two participants)' })
  @ApiParam({ name: 'id', description: 'Game id' })
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.getGame(id, user.userId);
  }

  @Post(':id/roll')
  @ApiOperation({
    summary: "Roll the dice on the current player's turn",
    description: 'Bust ends the turn and forfeits the round score; a non-bust roll adds to the round score and stays in the same turn.',
  })
  @ApiParam({ name: 'id', description: 'Game id' })
  @Throttle(RAPID_TURN_THROTTLE)
  roll(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.roll(id, user.userId);
  }

  @Post(':id/hold')
  @ApiOperation({
    summary: 'Bank the round score and end the turn',
    description: 'A win is only ever recognised here — never mid-round, even once the round score already clears the winning threshold (see ARCHITECTURE.md §6).',
  })
  @ApiParam({ name: 'id', description: 'Game id' })
  @Throttle(RAPID_TURN_THROTTLE)
  hold(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.hold(id, user.userId);
  }

  @Post(':id/bot-turn')
  @ApiOperation({
    summary: 'Advance the computer opponent by exactly one action (one roll, or a hold)',
    description:
      'Call this repeatedly (e.g. with a short delay between calls, for animation) while it is the bot\'s turn — each call is one roll or the bot deciding to hold, never the whole turn at once. 403 if it is not currently the bot\'s turn. Strategy: domain/bot-policy.ts (fixed round-score threshold, see ARCHITECTURE.md §9b).',
  })
  @ApiParam({ name: 'id', description: 'Game id' })
  @Throttle(RAPID_TURN_THROTTLE)
  botTurn(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.gamesService.botTurn(id, user.userId);
  }

  @Post(':id/new')
  @ApiOperation({ summary: 'Start a rematch between the same two players once a game has finished' })
  @ApiParam({ name: 'id', description: 'Id of the finished game to rematch' })
  newGame(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: NewGameDto) {
    return this.gamesService.newGame(id, user.userId, dto?.winningScore);
  }
}
