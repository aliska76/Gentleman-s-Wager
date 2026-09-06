import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { DomainExceptionFilter } from '../../../src/common/domain-exception.filter';

/** Boots the real app (real Prisma, real modules) the same way main.ts does. */
export async function bootstrapTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new DomainExceptionFilter());
  await app.init();
  return app;
}

export interface LoggedInUser {
  token: string;
  userId: string;
  username: string;
}
