import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '../domain/errors';

const STATUS_BY_CODE: Record<string, number> = {
  NOT_YOUR_TURN: 403,
  GAME_ALREADY_FINISHED: 409,
  NOT_A_PARTICIPANT: 403,
  CANNOT_PLAY_SELF: 403,
  NOT_BOTS_TURN: 403,
};

/** Translates domain rule violations into HTTP responses, in one place. */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = STATUS_BY_CODE[exception.code] ?? 400;
    response.status(status).json({
      statusCode: status,
      error: exception.code,
      message: exception.message,
    });
  }
}
