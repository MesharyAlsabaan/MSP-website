import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBooleanString, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryProjectDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by typology key' })
  @IsOptional()
  @IsString()
  typology?: string;

  @ApiPropertyOptional({ description: 'Only featured projects (true/false)' })
  @IsOptional()
  @IsBooleanString()
  featured?: string;

  @ApiPropertyOptional({ description: 'Include drafts (admin only)' })
  @IsOptional()
  @IsBooleanString()
  includeDrafts?: string;
}
