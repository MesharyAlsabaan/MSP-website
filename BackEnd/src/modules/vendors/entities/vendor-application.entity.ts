import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { QualificationStatus } from '../vendor.enums';
import { Vendor } from './vendor.entity';

/**
 * A qualification request. Its `requestNumber` (REQ-2026-0042) never changes:
 * a completion round adds a new revision (v2, v3…) to the SAME application.
 */
@Entity('vendor_applications')
export class VendorApplication extends BaseEntity {
  @ApiProperty({ example: 'REQ-2026-0042' })
  @Index({ unique: true })
  @Column({ name: 'request_number', length: 16 })
  requestNumber: string;

  @ApiProperty({ format: 'uuid' })
  @Index()
  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @ManyToOne(() => Vendor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ApiProperty({ enum: QualificationStatus })
  @Index()
  @Column({ type: 'enum', enum: QualificationStatus, default: QualificationStatus.UnderReview })
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
