/**
 * Errors that come from the game rules themselves, as opposed to
 * infrastructure failures (DB down, etc.) or plain "not found" lookups.
 * Mapped to HTTP status codes in one place: common/domain-exception.filter.ts.
 */
export abstract class DomainError extends Error {
  abstract readonly code: string;
}

export class NotYourTurnError extends DomainError {
  readonly code = 'NOT_YOUR_TURN';
  constructor() {
    super('It is not your turn.');
  }
}

export class GameAlreadyFinishedError extends DomainError {
  readonly code = 'GAME_ALREADY_FINISHED';
  constructor() {
    super('This game has already finished.');
  }
}

export class NotAParticipantError extends DomainError {
  readonly code = 'NOT_A_PARTICIPANT';
  constructor() {
    super('You are not a participant in this game.');
  }
}
