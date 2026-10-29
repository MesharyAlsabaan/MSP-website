import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { ItemMode, ItemState } from '../planner';
import type { ProjectDraft } from '../draft';
import type { SyncReport } from '../report';

/** One execution of the sync: scheduled, manual or dry run. */
@Entity('project_sync_runs')
export class ProjectSyncRun extends BaseEntity {
  /**
   * Scheduled runs use their slot (`2026-10-29T05:00Z`) so the same slot can
   * never run twice, across restarts or replicas; manual runs get `manual:<ts>`.
   */
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  slot: string;

  @ApiProperty({ enum: ['schedule', 'catch-up', 'manual', 'retry', 'approval'] })
  @Column()
  trigger: string;

  @ApiProperty()
  @Column({ name: 'dry_run', default: false })
  dryRun: boolean;

  @ApiProperty({ enum: ['running', 'succeeded', 'attention', 'failed', 'skipped'] })
  @Column({ default: 'running' })
  status: string;

  @ApiProperty({ required: false })
  @Column({ name: 'requested_by', default: '' })
  requestedBy: string;

  @ApiProperty({ required: false })
  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ type: 'jsonb', nullable: true })
  report: SyncReport | null;

  @ApiProperty({ required: false })
  @Column({ name: 'report_text', type: 'text', default: '' })
  reportText: string;

  @ApiProperty({ required: false })
  @Column({ type: 'text', default: '' })
  error: string;
}

/** What the sync knows about one source folder. */
@Entity('project_sync_items')
export class ProjectSyncItem extends BaseEntity {
  @ApiProperty({ description: 'Drive folder ID — the stable identity' })
  @Index({ unique: true })
  @Column({ name: 'source_folder_id' })
  sourceFolderId: string;

  @ApiProperty()
  @Column({ name: 'folder_name' })
  folderName: string;

  @ApiProperty()
  @Column({ default: '' })
  slug: string;

  @ApiProperty({ enum: ['owned', 'linked'], description: 'linked = existing CMS project, never modified by the sync' })
  @Column({ type: 'varchar', default: 'owned' })
  mode: ItemMode;

  @ApiProperty({
    enum: ['draft', 'pending_review', 'approved', 'postponed', 'rejected', 'awaiting_verification', 'published', 'failed', 'linked', 'missing_from_source'],
  })
  @Column({ type: 'varchar', default: 'draft' })
  state: ItemState;

  @ApiProperty({ required: false })
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @ApiProperty()
  @Column({ name: 'source_hash', default: '' })
  sourceHash: string;

  @ApiProperty({ description: 'Source image → published upload, for change detection' })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  images: { sourceId: string; md5: string; url: string }[];

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  issues: string[];

  @ApiProperty()
  @Column({ type: 'int', default: 0 })
  attempts: number;

  @ApiProperty({ required: false })
  @Column({ name: 'last_published_at', type: 'timestamptz', nullable: true })
  lastPublishedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'last_verified_at', type: 'timestamptz', nullable: true })
  lastVerifiedAt: Date | null;

  @ApiProperty({ description: 'The project record as it was before the sync last changed it' })
  @Column({ name: 'previous_snapshot', type: 'jsonb', nullable: true })
  previousSnapshot: Record<string, unknown> | null;

  @ApiProperty({ required: false })
  @Column({ name: 'last_run_id', type: 'uuid', nullable: true })
  lastRunId: string | null;

  @ApiProperty({ description: 'The proposed page: facts with their sources, text, images', required: false })
  @Column({ type: 'jsonb', nullable: true })
  draft: ProjectDraft | null;

  @ApiProperty({ description: 'Hash of the draft as approved; publishing requires it to still match', required: false })
  @Column({ name: 'approved_hash', default: '' })
  approvedHash: string;

  @ApiProperty({ required: false })
  @Column({ name: 'decided_by', default: '' })
  decidedBy: string;

  @ApiProperty({ required: false })
  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'decision_note', type: 'text', default: '' })
  decisionNote: string;
}

/** Single-row switch the admin can flip; the schedule checks it every slot. */
@Entity('project_sync_control')
export class ProjectSyncControl {
  @PrimaryColumn({ default: 'control' })
  id: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ name: 'updated_by', default: '' })
  updatedBy: string;

  /** When the last frontend rebuild was requested, so verification can wait for it. */
  @Column({ name: 'deploy_requested_at', type: 'timestamptz', nullable: true })
  deployRequestedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
