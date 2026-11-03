import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpsertSettingDto {
  @ApiProperty()
  @IsOptional()
  value: any;
}
