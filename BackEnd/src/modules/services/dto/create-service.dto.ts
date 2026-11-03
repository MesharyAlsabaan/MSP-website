import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Localized } from '../../../common/types/localized.type';

export class CreateServiceDto {
  @ApiProperty() @IsString() slug: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) title: Localized;

  @ApiProperty({ type: Localized })
  @ValidateNested() @Type(() => Localized)
  shortDescription: Localized;

  @ApiProperty({ type: Localized })
  @ValidateNested() @Type(() => Localized)
  fullDescription: Localized;

  @ApiProperty() @IsOptional() @IsString() icon?: string;
  @ApiProperty() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
  @ApiProperty() @IsOptional() @IsBoolean() published?: boolean;
}
