import { Controller, Get, Inject, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { Response } from 'express';
import { CACHE, ICache } from '../../domain/ports/cache.port';
import { PrismaService } from '../../infrastructure/persistence/prisma/prisma.service';

// Shown in Swagger (unlike an earlier version of this file) so it's easy
// to poke from /docs during review/testing — but still @SkipThrottle:
// these are k8s probe endpoints, and a probe hitting /health/ready every
// few seconds is normal traffic, not abuse, so it must never be rate-limited.
@ApiTags('health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE) private readonly cache: ICache,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — process is up', description: 'k8s livenessProbe target. Always 200 if the process can respond at all.' })
  live() {
    return { status: 'ok' };
  }

  /** k8s-probe-shaped readiness: DB is mandatory, Redis is informational only. */
  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe — DB reachable (Redis is informational only)',
    description: 'k8s readinessProbe target. 503 if the database is unreachable; Redis being down never fails readiness (see ICache.isAvailable / graceful degradation).',
  })
  async ready(@Res() res: Response) {
    let databaseUp = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      databaseUp = false;
    }

    const redisUp = this.cache.isAvailable();
    const ready = databaseUp;

    res.status(ready ? 200 : 503).json({
      status: ready ? 'ready' : 'not_ready',
      database: databaseUp ? 'up' : 'down',
      redis: redisUp ? 'up' : 'down',
    });
  }
}
