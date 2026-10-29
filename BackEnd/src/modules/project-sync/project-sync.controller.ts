import { Body, Controller, Get, Logger, Param, ParseUUIDPipe, Post, Put, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Response } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ProjectSyncService } from './project-sync.service';

class RunDto {
  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}

class ControlDto {
  @IsBoolean()
  enabled: boolean;
}

class DecisionDto {
  /** publish: now, not at the next run · hold: keep off the site / stop updates · resume: undo a hold */
  @IsIn(['publish', 'hold', 'resume'])
  decision: 'publish' | 'hold' | 'resume';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** Field values are validated by the service against the draft's own shape. */
class DraftEditDto {
  @IsOptional()
  @IsObject()
  facts?: Record<string, string | string[]>;

  @IsOptional()
  @IsObject()
  content?: Record<string, string | string[]>;

  @IsOptional()
  @IsObject()
  images?: Record<string, boolean>;

  @IsOptional()
  @IsString()
  cover?: string;
}

/** Admin controls for the Drive → website project sync. Content managers only. */
@ApiTags('Project sync')
@ApiBearerAuth()
@Roles(Role.ContentManager)
@Controller('project-sync')
export class ProjectSyncController {
  private readonly logger = new Logger(ProjectSyncController.name);

  constructor(private readonly sync: ProjectSyncService) {}

  @Get('status')
  status() {
    return this.sync.status();
  }

  @Get('runs')
  runs(@Query('limit') limit?: string) {
    return this.sync.listRuns(Number(limit) || 30);
  }

  @Get('runs/:id')
  run(@Param('id', ParseUUIDPipe) id: string) {
    return this.sync.getRun(id);
  }

  /**
   * Starts a run in the background and returns at once; follow it in the
   * run history. A run already in progress makes this one a no-op.
   */
  @Post('run')
  start(@Body() dto: RunDto, @CurrentUser() user: AuthUser) {
    this.sync
      .run({ trigger: 'manual', dryRun: !!dto.dryRun, requestedBy: user.email })
      .catch((err) => this.logger.error(`Manual sync failed: ${(err as Error).message}`));
    return { started: true, dryRun: !!dto.dryRun };
  }

  @Put('control')
  control(@Body() dto: ControlDto, @CurrentUser() user: AuthUser) {
    return this.sync.setEnabled(dto.enabled, user.email);
  }

  @Get('items')
  items() {
    return this.sync.listItems();
  }

  @Get('items/:id')
  item(@Param('id', ParseUUIDPipe) id: string) {
    return this.sync.getItem(id);
  }

  /** Private preview of a source image (unapproved images are never on the public site). */
  @Get('items/:id/images/:md5')
  async image(@Param('id', ParseUUIDPipe) id: string, @Param('md5') md5: string, @Res() res: Response) {
    const data = await this.sync.preview(id, md5);
    res.set({ 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400' }).send(data);
  }

  @Put('items/:id/draft')
  edit(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DraftEditDto, @CurrentUser() user: AuthUser) {
    return this.sync.editDraft(id, dto, user.email);
  }

  @Post('items/:id/decision')
  decide(@Param('id', ParseUUIDPipe) id: string, @Body() dto: DecisionDto, @CurrentUser() user: AuthUser) {
    return this.sync.decide(id, dto.decision, user.email, dto);
  }

  @Post('items/:id/redraft')
  redraft(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.sync.redraft(id, user.email);
  }

  @Post('items/:id/retry')
  retry(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.sync.retry(id, user.email);
  }

  @Post('items/:id/revert')
  revert(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.sync.revert(id, user.email);
  }
}
