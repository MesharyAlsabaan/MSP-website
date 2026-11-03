import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePartnerDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsOptional() @IsString() logo?: string;
  @ApiProperty() @IsOptional() @IsString() url?: string;
  @ApiProperty() @IsOptional() @IsInt() sortOrder?: number;
  @ApiProperty() @IsOptional() @IsBoolean() active?: boolean;
}
