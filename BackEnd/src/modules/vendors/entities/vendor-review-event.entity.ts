import { ApiProperty } from '@nestjs/swagger';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ReviewAction } from '../vendor.enums';

/**
 * Append-only audit trail of everything that happened to an application: who
 * did what, when, and why. Never updated or deleted.
 */
@Entity('vendor_review_events')
export class VendorReviewEvent {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ name: 'application_id', type: 'uuid' })
  applicationId: string;

  @ApiProperty({ format: 'uuid', required: false })
  @Column({ name: 'revision_id', type: 'uuid', nullable: true })
  revisionId: string | null;

  @ApiProperty({ enum: ReviewAction })
  @Column({ type: 'enum', enum: ReviewAction })
  action: ReviewAction;

  @ApiProperty({ required: false })
  @Column({ type: 'text', default: '' })
  note: string;

  @ApiProperty({ type: [String], description: 'For completion requests: what is missing' })
  @Column({ name: 'missing_items', type: 'jsonb', default: () => "'[]'" })
  missingItems: string[];

  /** Null when the vendor (not a staff member) performed the action. */
  @ApiProperty({ format: 'uuid', required: false })
  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'actor_name', default: '' })
  actorName: string;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
