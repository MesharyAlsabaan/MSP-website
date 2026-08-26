import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { EmptyToUndefined } from '../../../common/decorators/empty-to-undefined.decorator';
import { Localized } from '../../../common/types/localized.type';
import { BlogStatus } from '../entities/blog-post.entity';

export class CreateBlogPostDto {
  @ApiProperty() @IsString() slug: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) title: Localized;

  @ApiProperty() @IsOptional() @IsString() category?: string;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) excerpt: Localized;

  @ApiProperty({ type: Localized }) @ValidateNested() @Type(() => Localized) body: Localized;

  @ApiProperty() @IsOptional() @IsString() cover?: string;
  @ApiProperty() @IsOptional() @IsString() author?: string;
  @ApiProperty({ enum: BlogStatus }) @IsOptional() @IsEnum(BlogStatus) status?: BlogStatus;
  @ApiProperty() @EmptyToUndefined() @IsOptional() @IsDateString() publishedAt?: string;

  @ApiProperty({ type: Localized })
  @IsOptional() @ValidateNested() @Type(() => Localized)
  seoTitle?: Localized;

  @ApiProperty({ type: Localized })
  @IsOptional() @ValidateNested() @Type(() => Localized)
  seoDescription?: Localized;

  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
}
