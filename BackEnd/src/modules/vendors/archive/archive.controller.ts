import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsInt, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { Response } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { ArchiveJobsService } from './archive-jobs.service';
import { ArchiveKeyGuard } from './archive-key.guard';

class LeaseDto {
  @IsString() @Length(1, 128) agentId: string;
  @IsOptional() @IsInt() @Min(30) @Max(3600) ttlSec?: number;
}
class LeasedActionDto {
  @IsString() @Length(1, 128) agentId: string;
  @IsString() @Length(64, 64) leaseToken: string;
}
class RenewDto extends LeasedActionDto {
  @IsOptional() @IsInt() @Min(30) @Max(3600) ttlSec?: number;
}
class StepDto extends LeasedActionDto {
  @IsString() @Length(1, 64) step: string;
}
class CompleteDto extends LeasedActionDto {
  @IsString() @Length(0, 1000) archivePath: string;
}
class FailDto extends LeasedActionDto {
  @IsString() @Length(0, 2000) error: string;
}
class HeartbeatDto {
  @IsString() @Length(1, 128) agentId: string;
  @IsObject() stats: Record<string, unknown>;
}

/**
 * Endpoints for the office archive agent. `@Public()` skips the staff JWT
 * guard; `ArchiveKeyGuard` then requires a valid service key on every call.
 */
@ApiTags('Archive agent')
@ApiHeader({ name: 'X-Archive-Key', required: true })
@Public()
@UseGuards(ArchiveKeyGuard)
@Throttle({ default: { limit: 600, ttl: 60_000 } })
@Controller('archive')
export class ArchiveController {
  constructor(private readonly jobs: ArchiveJobsService) {}

  @Get('jobs')
  @ApiOperation({ summary: 'Approved revisions waiting to be archived (pending or lease expired)' })
  pending() {
    return this.jobs.listPending();
  }

  @Post('jobs/:id/lease')
  @ApiOperation({ summary: 'Take a timed lease on a job; returns the manifest' })
  lease(@Param('id', ParseUUIDPipe) id: string, @Body() dto: LeaseDto) {
    return this.jobs.lease(id, dto.agentId, dto.ttlSec ?? 300);
  }

  @Post('jobs/:id/renew')
  renew(@Param('id', ParseUUIDPipe) id: string, @Body() dto: RenewDto) {
    return this.jobs.renew(id, dto.agentId, dto.leaseToken, dto.ttlSec ?? 300);
  }

  @Post('jobs/:id/step')
  @ApiOperation({ summary: 'Report progress (shown on the admin status screen)' })
  async step(@Param('id', ParseUUIDPipe) id: string, @Body() dto: StepDto) {
    await this.jobs.reportStep(id, dto.agentId, dto.leaseToken, dto.step);
    return { ok: true };
  }

  @Get('jobs/:id/documents/:docId')
  @ApiOperation({ summary: 'Stream one document of a leased job (agentId + leaseToken as query)' })
  async document(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('docId', ParseUUIDPipe) docId: string,
    @Req() req: { query: { agentId?: string; leaseToken?: string } },
    @Res() res: Response,
  ) {
    const file = await this.jobs.openDocument(id, docId, String(req.query.agentId ?? ''), String(req.query.leaseToken ?? ''));
    res.setHeader('Content-Type', file.mime);
    res.setHeader('Content-Length', String(file.sizeBytes));
    res.setHeader('X-Checksum-SHA256', file.sha256);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`);
    file.stream.pipe(res);
  }

  @Post('jobs/:id/complete')
  async complete(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CompleteDto) {
    await this.jobs.complete(id, dto.agentId, dto.leaseToken, dto.archivePath);
    return { ok: true };
  }

  @Post('jobs/:id/fail')
  async fail(@Param('id', ParseUUIDPipe) id: string, @Body() dto: FailDto) {
    await this.jobs.fail(id, dto.agentId, dto.leaseToken, dto.error);
    return { ok: true };
  }

  @Post('heartbeat')
  async heartbeat(@Req() req: { archiveKey: string }, @Body() dto: HeartbeatDto) {
    await this.jobs.heartbeat(req.archiveKey, { ...dto.stats, agentId: dto.agentId, at: new Date().toISOString() });
    return { ok: true };
  }
}
