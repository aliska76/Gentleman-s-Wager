import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  username: string;
}

type RequestWithUser = Request & { user?: AuthenticatedUser };

/**
 * The only place a token is checked. Deliberately separate from the
 * domain's "is this move legal" checks (see domain/game-engine.ts) —
 * this guard answers "who is calling", the domain answers "are they
 * allowed to do this right now".
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const header = request.headers['authorization'];

    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const token = header.slice('Bearer '.length);
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; username: string }>(token);
      request.user = { userId: payload.sub, username: payload.username };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
