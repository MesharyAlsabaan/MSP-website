import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryServiceDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Only featured services (true/false)' })
  @IsOptional()
  @IsBooleanString()
  featured?: string;

  @ApiPropertyOptional({ description: 'Include drafts (admin only)' })
  @IsOptional()
  @IsBooleanString()
  includeDrafts?: string;
}
