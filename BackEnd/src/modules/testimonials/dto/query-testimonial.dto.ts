import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTestimonialDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Include drafts (admin only)' })
  @IsOptional()
  @IsBooleanString()
  includeDrafts?: string;
}
