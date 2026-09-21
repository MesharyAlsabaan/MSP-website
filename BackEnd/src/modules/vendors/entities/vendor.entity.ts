import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * The vendor's permanent identity. `vendorNumber` (SUP-000123) is issued once
 * at first registration from a sequence that is never reused, so the archive
 * folder keeps its name even if the company is renamed later.
 */
@Entity('vendors')
export class Vendor extends BaseEntity {
  @ApiProperty({ example: 'SUP-000123' })
  @Index({ unique: true })
  @Column({ name: 'vendor_number', length: 16 })
  vendorNumber: string;

  /** The login that owns this vendor record. One account ↔ one vendor. */
  @ApiProperty({ format: 'uuid' })
  @Index({ unique: true })
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @ApiProperty()
  @Column({ name: 'company_name' })
  companyName: string;

  @ApiProperty({ required: false })
  @Column({ name: 'company_name_en', default: '' })
  companyNameEn: string;

  @ApiProperty({ example: 'general-contractor' })
  @Column({ name: 'primary_category_key', length: 64 })
  primaryCategoryKey: string;

  @ApiProperty({ type: [String] })
  @Column({ name: 'secondary_category_keys', type: 'jsonb', default: () => "'[]'" })
  secondaryCategoryKeys: string[];

  /** The revision whose data and documents are the vendor's approved record. */
  @ApiProperty({ required: false, format: 'uuid' })
  @Column({ name: 'approved_revision_id', type: 'uuid', nullable: true })
  approvedRevisionId: string | null;
}
