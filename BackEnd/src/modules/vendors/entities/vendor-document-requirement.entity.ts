import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VendorCategory } from './vendor-category.entity';

/**
 * One document type a category asks for (commercial registration, VAT
 * certificate, company profile…). Per-category configuration: the same
 * `docTypeKey` may be required by one category and optional for another.
 * `archiveFolder` is the Arabic sub-folder the office archive files it under.
 */
@Entity('vendor_document_requirements')
@Index(['categoryKey', 'docTypeKey'], { unique: true })
export class VendorDocumentRequirement extends BaseEntity {
  @ApiProperty({ example: 'general-contractor' })
  @Column({ name: 'category_key', length: 64 })
  categoryKey: string;

  @ManyToOne(() => VendorCategory, (c) => c.requirements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'category_key' })
  category: VendorCategory;

  @ApiProperty({ example: 'commercial-registration' })
  @Column({ name: 'doc_type_key', length: 64 })
  docTypeKey: string;

  @ApiProperty({ example: 'السجل التجاري' })
  @Column({ name: 'name_ar' })
  nameAr: string;

  @ApiProperty({ example: 'Commercial registration' })
  @Column({ name: 'name_en' })
  nameEn: string;

  @ApiProperty()
  @Column({ default: true })
  required: boolean;

  @ApiProperty({ description: 'Vendor must enter an expiry date for this document' })
  @Column({ name: 'requires_expiry', default: false })
  requiresExpiry: boolean;

  @ApiProperty({ example: 'السجل التجاري', description: 'Archive sub-folder name' })
  @Column({ name: 'archive_folder' })
  archiveFolder: string;

  @ApiProperty()
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
