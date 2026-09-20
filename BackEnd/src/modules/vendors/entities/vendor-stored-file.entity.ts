import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Content-addressed blob record. The bytes live in the DocumentStorage under
 * `storageKey`; `sha256` is the identity, so re-uploading an unchanged file in
 * a later revision points at the same record and stores nothing twice.
 */
@Entity('vendor_stored_files')
export class VendorStoredFile extends BaseEntity {
  @ApiProperty({ example: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' })
  @Index({ unique: true })
  @Column({ length: 64 })
  sha256: string;

  @ApiProperty()
  @Column({ name: 'size_bytes', type: 'bigint' })
  sizeBytes: string;

  @ApiProperty({ example: 'application/pdf' })
  @Column({ length: 128 })
  mime: string;

  @ApiProperty({ description: 'Key inside the configured DocumentStorage' })
  @Column({ name: 'storage_key', length: 200 })
  storageKey: string;
}
