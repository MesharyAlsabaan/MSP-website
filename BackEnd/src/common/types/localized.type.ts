import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Bilingual text value stored as a single jsonb column. Mirrors the frontend
 * `L` type ({ en, ar }) used across the public site.
 */
export class Localized {
  @ApiProperty({ example: 'Architecture' })
  @IsString()
  en: string;

  @ApiProperty({ example: 'العمارة' })
  @IsString()
  ar: string;
}
