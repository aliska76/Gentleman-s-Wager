import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description:
      'Any display name. Simplified mock auth — no password, no signup step — but a real JWT is still issued (see ARCHITECTURE.md §10).',
    example: 'edmund',
    minLength: 2,
    maxLength: 24,
  })
  @IsString()
  @Length(2, 24)
  username!: string;
}
