import { INestApplication } from '@nestjs/common';
import request = require('supertest'); 
import { bootstrapTestApp, LoggedInUser } from './utils/bootstrap-app';

describe('Games (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await bootstrapTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(username: string): Promise<LoggedInUser> {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: `${username}-${Math.random().toString(36).slice(2, 7)}` });
    return res.body as LoggedInUser;
  }

  /**
   * The bot never logs in itself (it makes no HTTP calls at all) — any
   * authenticated human fetches its stable id via GET /users/bot, exactly
   * as the real frontend would before starting a game against it. Relies
   * on `scripts/push-test-db.js` having seeded it via `prisma/seed.ts`
   * before this suite runs (see `pretest:e2e`).
   */
  async function fetchBot(asUser: LoggedInUser): Promise<LoggedInUser> {
    const res = await request(app.getHttpServer())
      .get('/users/bot')
      .set('Authorization', `Bearer ${asUser.token}`);
    expect(res.status).toBe(200);
    expect(res.body.isBot).toBe(true);
    return { token: '', userId: res.body.id, username: res.body.username };
  }

  async function createGame(host: LoggedInUser, opponent: LoggedInUser, winningScore = 100) {
    const res = await request(app.getHttpServer())
      .post('/games')
      .set('Authorization', `Bearer ${host.token}`)
      .send({ opponentUserId: opponent.userId, winningScore });
    return res.body;
  }

  it('only the current-turn player may roll or hold', async () => {
    const p1 = await login('edmund');
    const p2 = await login('charlotte');
    const game = await createGame(p1, p2);

    expect(game.currentPlayerId).toBe(p1.userId);

    const wrongRoll = await request(app.getHttpServer())
      .post(`/games/${game.id}/roll`)
      .set('Authorization', `Bearer ${p2.token}`);
    expect(wrongRoll.status).toBe(403);
    expect(wrongRoll.body.error).toBe('NOT_YOUR_TURN');

    const wrongHold = await request(app.getHttpServer())
      .post(`/games/${game.id}/hold`)
      .set('Authorization', `Bearer ${p2.token}`);
    expect(wrongHold.status).toBe(403);
  });

  it('a non-participant cannot see or act on someone else’s game', async () => {
    const p1 = await login('edmund');
    const p2 = await login('charlotte');
    const outsider = await login('bystander');
    const game = await createGame(p1, p2);

    const res = await request(app.getHttpServer())
      .get(`/games/${game.id}`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('NOT_A_PARTICIPANT');
  });

  it('rolling returns two dice in range and updates the round score accordingly', async () => {
    const p1 = await login('edmund');
    const p2 = await login('charlotte');
    const game = await createGame(p1, p2);

    const res = await request(app.getHttpServer())
      .post(`/games/${game.id}/roll`)
      .set('Authorization', `Bearer ${p1.token}`);

    expect(res.status).toBe(201);
    const { dice, busted, state } = res.body;
    expect(dice).toHaveLength(2);
    dice.forEach((d: number) => {
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    });
    if (busted) {
      expect(state.roundScore).toBe(0);
      expect(state.currentPlayerId).toBe(p2.userId);
    } else {
      expect(state.roundScore).toBe(dice[0] + dice[1]);
      expect(state.currentPlayerId).toBe(p1.userId);
    }
  });

  it('drives a full game to completion and reports a winner from the assignment’s exact rules', async () => {
    const p1 = await login('edmund');
    const p2 = await login('charlotte');
    // A low winning score makes this converge in a handful of turns without
    // needing to control real randomness — see ARCHITECTURE.md §13 for why
    // exhaustive rule permutations belong in the domain unit tests instead;
    // this e2e test exists to prove the HTTP wiring carries them faithfully.
    let game = await createGame(p1, p2, 3);

    let winner: string | null = null;
    for (let i = 0; i < 60 && !winner; i += 1) {
      const turnUser = game.currentPlayerId === p1.userId ? p1 : p2;

      const rollRes = await request(app.getHttpServer())
        .post(`/games/${game.id}/roll`)
        .set('Authorization', `Bearer ${turnUser.token}`);
      game = rollRes.body.state;

      if (rollRes.body.busted) continue; // turn already passed

      const holdRes = await request(app.getHttpServer())
        .post(`/games/${game.id}/hold`)
        .set('Authorization', `Bearer ${turnUser.token}`);
      game = holdRes.body;

      if (game.status === 'FINISHED') winner = game.winnerId;
    }

    expect(winner).not.toBeNull();
    expect([p1.userId, p2.userId]).toContain(winner);
    expect(game.status).toBe('FINISHED');

    // The win must be reflected in the winner's public profile immediately (§8: synchronous on win).
    const winnerUser = winner === p1.userId ? p1 : p2;
    const profile = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${winnerUser.token}`);
    expect(profile.body.wins).toBeGreaterThanOrEqual(1);
  });

  it('the computer opponent cannot be advanced when it is not its turn', async () => {
    const p1 = await login('edmund');
    const bot = await fetchBot(p1);
    const game = await createGame(p1, bot);

    // createGame always starts with the creator's turn (see games.service.spec.ts) —
    // the bot has nothing to do yet.
    expect(game.currentPlayerId).toBe(p1.userId);

    const res = await request(app.getHttpServer())
      .post(`/games/${game.id}/bot-turn`)
      .set('Authorization', `Bearer ${p1.token}`);
    expect(res.status).toBe(403);
  });

  it('a human can play a full game against the seeded computer opponent', async () => {
    const human = await login('edmund');
    const bot = await fetchBot(human);
    // Low winning score, same reasoning as the human-vs-human full game
    // test above: converges in a handful of turns with real randomness.
    let game = await createGame(human, bot, 3);

    let winner: string | null = null;
    for (let i = 0; i < 120 && !winner; i += 1) {
      if (game.currentPlayerId === human.userId) {
        const rollRes = await request(app.getHttpServer())
          .post(`/games/${game.id}/roll`)
          .set('Authorization', `Bearer ${human.token}`);
        game = rollRes.body.state;
        if (rollRes.body.busted) continue; // turn already passed to the bot

        const holdRes = await request(app.getHttpServer())
          .post(`/games/${game.id}/hold`)
          .set('Authorization', `Bearer ${human.token}`);
        game = holdRes.body;
      } else {
        // The bot's turn — advance it one action at a time, exactly like
        // the frontend would (see games.controller.ts bot-turn docs).
        // Any participant's token may prompt it; the bot makes no calls itself.
        const botTurnRes = await request(app.getHttpServer())
          .post(`/games/${game.id}/bot-turn`)
          .set('Authorization', `Bearer ${human.token}`);
        expect(botTurnRes.status).toBe(201);
        game = botTurnRes.body.state;
      }

      if (game.status === 'FINISHED') winner = game.winnerId;
    }

    expect(winner).not.toBeNull();
    expect([human.userId, bot.userId]).toContain(winner);
    expect(game.status).toBe('FINISHED');
  });

  it('"new" starts a fresh game for the same two players', async () => {
    const p1 = await login('edmund');
    const p2 = await login('charlotte');
    const original = await createGame(p1, p2, 100);

    const res = await request(app.getHttpServer())
      .post(`/games/${original.id}/new`)
      .set('Authorization', `Bearer ${p1.token}`)
      .send({ winningScore: 25 });

    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(original.id);
    expect(res.body.winningScore).toBe(25);
    expect(res.body.score1).toBe(0);
    expect(res.body.score2).toBe(0);
  });
});
