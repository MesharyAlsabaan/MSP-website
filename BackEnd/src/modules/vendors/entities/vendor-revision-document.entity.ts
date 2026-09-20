import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { VendorApplicationRevision } from './vendor-application-revision.entity';
import { VendorStoredFile } from './vendor-stored-file.entity';

/**
 * A document attached to one revision: which requirement it satisfies, the
 * name the vendor gave it, and the stored blob it points at.
 */
@Entity('vendor_revision_documents')
@Index(['revisionId', 'docTypeKey', 'originalFilename'], { unique: true })
export class VendorRevisionDocument extends BaseEntity {
  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'revision_id', type: 'uuid' })
  revisionId: string;

  @ManyToOne(() => VendorApplicationRevision, (r) => r.documents, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'revision_id' })
  revision: VendorApplicationRevision;

  @ApiProperty({ example: 'commercial-registration' })
  @Column({ name: 'doc_type_key', length: 64 })
  docTypeKey: string;

  @ApiProperty({ example: 'السجل التجاري.pdf' })
  @Column({ name: 'original_filename' })
  originalFilename: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ name: 'stored_file_id', type: 'uuid' })
  storedFileId: string;

  @ManyToOne(() => VendorStoredFile, { onDelete: 'RESTRICT', eager: true })
  @JoinColumn({ name: 'stored_file_id' })
  storedFile: VendorStoredFile;

  @ApiProperty({ required: false, type: String, format: 'date' })
  @Column({ name: 'expires_at', type: 'date', nullable: true })
  expiresAt: string | null;
}
