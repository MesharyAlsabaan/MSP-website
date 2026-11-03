import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryPartnerDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Include inactive partners (admin only)' })
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
