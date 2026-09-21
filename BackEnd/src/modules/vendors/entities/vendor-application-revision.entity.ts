import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { RevisionDecision, VendorProfileData } from '../vendor.enums';
import { VendorApplication } from './vendor-application.entity';
import { VendorRevisionDocument } from './vendor-revision-document.entity';

/**
 * One revision of an application. While `submittedAt` is null it is the
 * vendor's editable draft; once submitted it is immutable — the data snapshot
 * and its documents are exactly what the reviewer saw, and what the archive
 * stores if this revision is the one approved.
 */
@Entity('vendor_application_revisions')
@Index(['applicationId', 'revisionNo'], { unique: true })
export class VendorApplicationRevision extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ManyToOne(() => VendorApplication, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'application_id' })
  application: VendorApplication;

  @ApiProperty({ example: 1 })
  @Column({ name: 'revision_no' })
  revisionNo: number;

  @ApiProperty({ description: 'Frozen copy of the form as submitted' })
  @Column({ type: 'jsonb' })
  data: VendorProfileData;

  @ApiProperty({ required: false, description: 'null while still a draft' })
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @ApiProperty({ enum: RevisionDecision, required: false })
  @Column({ type: 'enum', enum: RevisionDecision, nullable: true })
  decision: RevisionDecision | null;

  @ApiProperty({ required: false })
  @Column({ name: 'decided_at', type: 'timestamptz', nullable: true })
  decidedAt: Date | null;

  @ApiProperty({ required: false, format: 'uuid' })
  @Column({ name: 'decided_by_user_id', type: 'uuid', nullable: true })
  decidedByUserId: string | null;

  /** Reviewer's display name at decision time (kept even if the user is later removed). */
  @ApiProperty({ required: false })
  @Column({ name: 'decided_by_name', default: '' })
  decidedByName: string;

  @ApiProperty({ required: false })
  @Column({ name: 'decision_note', type: 'text', default: '' })
  decisionNote: string;

  @OneToMany(() => VendorRevisionDocument, (d) => d.revision)
  documents: VendorRevisionDocument[];
}
