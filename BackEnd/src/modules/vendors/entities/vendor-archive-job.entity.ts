import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ArchiveStatus } from '../vendor.enums';
import { VendorApplicationRevision } from './vendor-application-revision.entity';
import { Vendor } from './vendor.entity';

/**
 * Work order for the office agent: "archive this approved revision". Created
 * in the same transaction as the approval, so an approval without a job can
 * not exist. One job per revision (unique) → re-approving the same revision
 * can never create a duplicate.
 *
 * Leasing: an agent takes a short lease (`leaseOwner`, `leaseToken`,
 * `leaseExpiresAt`); if the agent dies the lease expires and the job becomes
 * claimable again. `sequenceNo` (= revision number) enforces that a vendor's
 * older approved revision is archived before a newer one.
 */
@Entity('vendor_archive_jobs')
export class VendorArchiveJob extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Index({ unique: true })
  @Column({ name: 'revision_id', type: 'uuid' })
  revisionId: string;

  @OneToOne(() => VendorApplicationRevision, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'revision_id' })
  revision: VendorApplicationRevision;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ApiProperty({ example: 1 })
  @Column({ name: 'sequence_no' })
  sequenceNo: number;

  @ApiProperty({ enum: ArchiveStatus })
  @Index()
  @Column({ type: 'enum', enum: ArchiveStatus, default: ArchiveStatus.Pending })
  status: ArchiveStatus;

  @ApiProperty()
  @Column({ default: 0 })
  attempts: number;

  @ApiProperty({ required: false })
  @Column({ name: 'lease_owner', type: 'varchar', length: 128, nullable: true })
  leaseOwner: string | null;

  /** Random token proving the caller holds the current lease. Never returned in listings. */
  @Column({ name: 'lease_token', type: 'varchar', length: 64, nullable: true, select: false })
  leaseToken: string | null;

  @ApiProperty({ required: false })
  @Column({ name: 'lease_expires_at', type: 'timestamptz', nullable: true })
  leaseExpiresAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'last_error', type: 'text', default: '' })
  lastError: string;

  @ApiProperty({ required: false, description: 'Agent-reported step (for the status screen)' })
  @Column({ name: 'last_step', length: 64, default: '' })
  lastStep: string;

  @ApiProperty({ required: false, description: 'Folder the agent placed the vendor in' })
  @Column({ name: 'archive_path', type: 'text', default: '' })
  archivePath: string;

  @ApiProperty({ required: false })
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
