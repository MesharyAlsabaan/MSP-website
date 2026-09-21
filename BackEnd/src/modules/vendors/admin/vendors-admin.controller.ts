import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { AuthUser, CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Role } from '../../../common/enums/role.enum';
import { ArchiveJobsService } from '../archive/archive-jobs.service';
import { VendorCategory, VendorDocumentRequirement } from '../entities';
import { Actor, ReviewService } from '../review.service';
import { ArchiveStatus, QualificationStatus } from '../vendor.enums';

class ListDto extends PaginationQueryDto {
  @IsOptional() @IsEnum(QualificationStatus) status?: QualificationStatus;
  @IsOptional() @IsEnum(ArchiveStatus) archiveStatus?: ArchiveStatus;
}
class RequestCompletionDto {
  @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) missingItems: string[];
  @IsOptional() @IsString() @Length(0, 2000) note?: string;
}
class NoteDto {
  @IsOptional() @IsString() @Length(0, 2000) note?: string;
}
class RejectDto {
  @IsString() @Length(1, 2000) reason: string;
}
class CategoryDto {
  @IsString() @Matches(/^[a-z0-9-]{2,64}$/) key: string;
  @IsString() @Length(1, 120) nameAr: string;
  @IsString() @Length(1, 120) nameEn: string;
  @IsOptional() @IsBoolean() active?: boolean;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class RequirementDto {
  @IsString() @Matches(/^[a-z0-9-]{2,64}$/) docTypeKey: string;
  @IsString() @Length(1, 120) nameAr: string;
  @IsString() @Length(1, 120) nameEn: string;
  @IsBoolean() required: boolean;
  @IsBoolean() requiresExpiry: boolean;
  @IsString() @Length(1, 120) archiveFolder: string;
  @IsOptional() @IsInt() @Min(0) sortOrder?: number;
}
class CreateKeyDto {
  @IsString() @Length(1, 128) name: string;
}

/**
 * Staff endpoints. Reviewing and deciding is limited to SUPER_ADMIN and
 * VENDOR_REVIEWER (RolesGuard lets SUPER_ADMIN through everything);
 * configuration (categories, requirements, agent keys) is SUPER_ADMIN only.
 */
@ApiTags('Vendors (admin)')
@ApiBearerAuth()
@Roles(Role.VendorReviewer)
@Controller('admin/vendors')
export class VendorsAdminController {
  constructor(
    private readonly review: ReviewService,
    private readonly jobs: ArchiveJobsService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------- review

  @Get()
  @ApiOperation({ summary: 'Applications with qualification and archive status' })
  list(@Query() q: ListDto) {
    return this.review.list({ page: q.page, pageSize: q.pageSize, status: q.status, archiveStatus: q.archiveStatus, q: q.search });
  }

  @Get('archive/status')
  @ApiOperation({ summary: 'Agent heartbeats, pending and failed archive jobs' })
  async archiveStatus() {
    const [keys, pending] = await Promise.all([this.jobs.listKeys(), this.jobs.listPending()]);
    const failed = await this.review.list({ page: 1, pageSize: 50, archiveStatus: ArchiveStatus.Failed });
    return { agents: keys, pending, failed: failed.data };
  }

  @Get(':id')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.review.detail(id);
  }

  @Get('documents/:docId')
  @ApiOperation({ summary: 'Download a vendor document (authenticated; never public)' })
  async document(@Param('docId', ParseUUIDPipe) docId: string, @Res() res: Response) {
    const f = await this.review.openDocument(docId);
    res.setHeader('Content-Type', f.mime);
    res.setHeader('Content-Length', String(f.sizeBytes));
    res.setHeader('X-Checksum-SHA256', f.sha256);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`);
    f.stream.pipe(res);
  }

  @Post(':id/request-completion')
  async requestCompletion(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RequestCompletionDto, @CurrentUser() user: AuthUser) {
    return this.review.requestCompletion(id, await this.actor(user), dto.missingItems, dto.note ?? '');
  }

  @Post(':id/request-update')
  @ApiOperation({ summary: 'Re-open an approved vendor for updated documents (renewal round)' })
  async requestUpdate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RequestCompletionDto, @CurrentUser() user: AuthUser) {
    return this.review.requestUpdate(id, await this.actor(user), dto.missingItems, dto.note ?? '');
  }

  @Post(':id/approve')
  async approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: NoteDto, @CurrentUser() user: AuthUser) {
    return this.review.approve(id, await this.actor(user), dto.note ?? '');
  }

  @Post(':id/reject')
  async reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectDto, @CurrentUser() user: AuthUser) {
    return this.review.reject(id, await this.actor(user), dto.reason);
  }

  @Post('archive/jobs/:jobId/retry')
  async retry(@Param('jobId', ParseUUIDPipe) jobId: string, @CurrentUser() user: AuthUser) {
    return this.review.retryArchive(jobId, await this.actor(user));
  }

  // ---------------------------------------------------------------- configuration (SuperAdmin)

  @Get('config/categories')
  @Roles(Role.SuperAdmin)
  categories() {
    return this.dataSource.getRepository(VendorCategory).find({ order: { sortOrder: 'ASC' }, relations: { requirements: true } });
  }

  @Put('config/categories/:key')
  @Roles(Role.SuperAdmin)
  upsertCategory(@Param('key') key: string, @Body() dto: CategoryDto) {
    return this.dataSource.getRepository(VendorCategory).save({ ...dto, key });
  }

  @Put('config/categories/:key/requirements/:docTypeKey')
  @Roles(Role.SuperAdmin)
  async upsertRequirement(@Param('key') key: string, @Param('docTypeKey') docTypeKey: string, @Body() dto: RequirementDto) {
    const repo = this.dataSource.getRepository(VendorDocumentRequirement);
    const existing = await repo.findOneBy({ categoryKey: key, docTypeKey });
    return repo.save({ ...(existing ?? {}), ...dto, categoryKey: key, docTypeKey });
  }

  @Delete('config/categories/:key/requirements/:docTypeKey')
  @Roles(Role.SuperAdmin)
  async deleteRequirement(@Param('key') key: string, @Param('docTypeKey') docTypeKey: string) {
    await this.dataSource.getRepository(VendorDocumentRequirement).delete({ categoryKey: key, docTypeKey });
    return { ok: true };
  }

  @Get('config/archive-keys')
  @Roles(Role.SuperAdmin)
  keys() {
    return this.jobs.listKeys();
  }

  @Post('config/archive-keys')
  @Roles(Role.SuperAdmin)
  @ApiOperation({ summary: 'Create an agent key — the plaintext is returned ONCE' })
  createKey(@Body() dto: CreateKeyDto) {
    return this.jobs.createKey(dto.name);
  }

  @Delete('config/archive-keys/:id')
  @Roles(Role.SuperAdmin)
  async revokeKey(@Param('id', ParseUUIDPipe) id: string) {
    await this.jobs.revokeKey(id);
    return { ok: true };
  }

  /** Attribution comes from the staff token itself: this service has no users table. */
  private async actor(user: AuthUser): Promise<Actor> {
    return { id: user.id, name: user.name?.trim() || user.email };
  }
}
