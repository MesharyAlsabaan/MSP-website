import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { VendorDocumentRequirement } from './vendor-document-requirement.entity';

/**
 * A vendor classification (contractor, supplier, consultant…). Editable data,
 * not code: the list is seeded and then maintained by SuperAdmin. `key` is the
 * stable identifier used in application snapshots and archive folder names.
 */
@Entity('vendor_categories')
export class VendorCategory {
  @ApiProperty({ example: 'general-contractor' })
  @PrimaryColumn({ length: 64 })
  key: string;

  @ApiProperty({ example: 'مقاولون عامون' })
  @Column({ name: 'name_ar' })
  nameAr: string;

  @ApiProperty({ example: 'General contractors' })
  @Column({ name: 'name_en' })
  nameEn: string;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;

  @ApiProperty()
  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => VendorDocumentRequirement, (r) => r.category)
  requirements: VendorDocumentRequirement[];
}
