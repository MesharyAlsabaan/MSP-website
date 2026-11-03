import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryTeamMemberDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Include inactive members (admin only)' })
  @IsOptional()
  @IsBooleanString()
  includeInactive?: string;
}
