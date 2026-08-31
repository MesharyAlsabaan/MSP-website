import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Localized } from '../../../common/types/localized.type';
import { ProjectStatus } from '../entities/project.entity';

class TypologyDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() en: string;
  @ApiProperty() @IsString() ar: string;
}

/** A taxonomy term on any of the three axes — same shape, different lists. */
class TermDto {
  @ApiProperty() @IsString() key: string;
  @ApiProperty() @IsString() en: string;
  @ApiProperty() @IsString() ar: string;
}

class SpecDto {
  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) label: Localized;
  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) value: Localized;
}

export class CreateProjectDto {
  @ApiProperty() @IsString() slug: string;
  @ApiProperty() @IsOptional() @IsString() no?: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) title: Localized;
  @ApiProperty({ type: TypologyDto }) @ValidateNested() @Type(() => TypologyDto) typology: TypologyDto;

  // The two filter axes and the scope axis. All optional, so a client that
  // predates them still saves, and each defaults to an empty list.
  @ApiProperty({ type: [TermDto], required: false })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TermDto)
  designCategories?: TermDto[];

  @ApiProperty({ type: [TermDto], required: false })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TermDto)
  sectors?: TermDto[];

  @ApiProperty({ type: [TermDto], required: false })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => TermDto)
  disciplines?: TermDto[];

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) location: Localized;
  @ApiProperty() @IsOptional() @IsString() year?: string;
  @ApiProperty() @IsOptional() @IsString() cover?: string;

  @ApiProperty({ type: [String] }) @IsOptional() @IsArray() gallery?: string[];

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) summary: Localized;

  @ApiProperty({ type: [Localized] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => Localized)
  description?: Localized[];

  @ApiProperty({ type: [SpecDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => SpecDto)
  specs?: SpecDto[];

  @ApiProperty({ type: [Localized] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => Localized)
  services?: Localized[];

  @ApiProperty() @IsOptional() @IsString() clientName?: string;
  @ApiProperty() @IsOptional() @IsString() projectUrl?: string;
  @ApiProperty({ enum: ProjectStatus }) @IsOptional() @IsEnum(ProjectStatus) status?: ProjectStatus;
  @ApiProperty() @IsOptional() @IsBoolean() featured?: boolean;
  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
}
