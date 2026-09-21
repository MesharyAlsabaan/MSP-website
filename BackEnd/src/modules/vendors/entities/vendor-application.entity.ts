import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { QualificationStatus } from '../vendor.enums';
import { Vendor } from './vendor.entity';

/**
 * A qualification request. Starts as a draft; `requestNumber` (REQ-2026-0042)
 * is issued at the first submission and never changes: a completion round
 * adds a new draft revision (v2, v3…) to the SAME application.
 */
@Entity('vendor_applications')
export class VendorApplication extends BaseEntity {
  /** Issued at the first submission; null while the application is still a draft. */
  @ApiProperty({ example: 'REQ-2026-0042', required: false })
  @Index({ unique: true })
  @Column({ name: 'request_number', type: 'varchar', length: 16, nullable: true })
  requestNumber: string | null;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ApiProperty({ enum: QualificationStatus })
  @Index()
  @Column({ type: 'enum', enum: QualificationStatus, default: QualificationStatus.Draft })
  status: QualificationStatus;

  /** Revision number of the latest submission (1-based). */
  @ApiProperty({ example: 2 })
  @Column({ name: 'current_revision_no', default: 1 })
  currentRevisionNo: number;

  /** Where completion requests and decisions are sent. */
  @ApiProperty()
  @Column({ name: 'submitter_email' })
  submitterEmail: string;
}
