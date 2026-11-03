import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Localized } from '../../../common/types/localized.type';

export class CreateTestimonialDto {
  @ApiProperty() @IsString() clientName: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) role: Localized;
  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) quote: Localized;

  @ApiProperty() @IsOptional() @IsString() photo?: string;
  @ApiProperty() @IsOptional() @IsInt() @Min(1) @Max(5) rating?: number;
  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
  @ApiProperty() @IsOptional() @IsBoolean() published?: boolean;
}
