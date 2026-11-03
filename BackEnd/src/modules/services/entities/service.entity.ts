import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Localized } from '../../../common/types/localized.type';

/**
 * Service offering. Localized fields are stored as jsonb ({ en, ar }) to
 * mirror the frontend localized content model used across the public site.
 */
@Entity('services')
export class Service extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  slug: string;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  title: Localized;

  @ApiProperty({ type: Localized })
  @Column({ name: 'short_description', type: 'jsonb' })
  shortDescription: Localized;

  @ApiProperty({ type: Localized })
  @Column({ name: 'full_description', type: 'jsonb' })
  fullDescription: Localized;

  @ApiProperty({ description: 'Icon name or image filename' })
  @Column({ default: '' })
  icon: string;

  @ApiProperty()
  @Column({ default: false })
  featured: boolean;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @Column({ default: true })
  published: boolean;
}
