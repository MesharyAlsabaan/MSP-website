import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Localized } from '../../../common/types/localized.type';

/**
 * Team member profile. Localized fields are stored as jsonb ({ en, ar }) to
 * mirror the bilingual content model used across the site.
 */
@Entity('team_members')
export class TeamMember extends BaseEntity {
  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty({ type: Localized, description: 'Job title, bilingual' })
  @Column({ type: 'jsonb' })
  title: Localized;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  bio: Localized;

  @ApiProperty({ description: 'Image filename or URL' })
  @Column({ default: '' })
  photo: string;

  @ApiProperty({ required: false })
  @Column({ default: '' })
  email: string;

  @ApiProperty({ required: false })
  @Column({ default: '' })
  phone: string;

  @ApiProperty({ required: false })
  @Column({ default: '' })
  linkedin: string;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;
}
