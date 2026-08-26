import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';
import { Localized } from '../../../common/types/localized.type';

export class CreateTeamMemberDto {
  @ApiProperty() @IsString() name: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) title: Localized;
  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) bio: Localized;

  @ApiProperty() @IsOptional() @IsString() photo?: string;
  @ApiProperty() @EmptyToUndefined() @IsOptional() @IsEmail() email?: string;
  @ApiProperty() @IsOptional() @IsString() phone?: string;
  @ApiProperty() @IsOptional() @IsString() linkedin?: string;
  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
  @ApiProperty() @IsOptional() @IsBoolean() active?: boolean;
}
