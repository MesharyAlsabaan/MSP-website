import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Localized } from '../../../common/types/localized.type';

/**
 * Client testimonial. Localized fields are stored as jsonb ({ en, ar }) to
 * mirror the frontend bilingual content model used across the public site.
 */
@Entity('testimonials')
export class Testimonial extends BaseEntity {
  @ApiProperty()
  @Column({ name: 'client_name' })
  clientName: string;

  @ApiProperty({ type: Localized, description: 'Role / company, bilingual' })
  @Column({ type: 'jsonb' })
  role: Localized;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  quote: Localized;

  @ApiProperty({ description: 'Photo filename or URL' })
  @Column({ default: '' })
  photo: string;

  @ApiProperty()
  @Column({ type: 'int', default: 5 })
  rating: number;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @Column({ default: true })
  published: boolean;
}
