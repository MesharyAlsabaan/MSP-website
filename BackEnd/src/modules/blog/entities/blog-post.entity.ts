import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Localized } from '../../../common/types/localized.type';

export enum BlogStatus {
  Draft = 'draft',
  Published = 'published',
}

/**
 * Blog post. Localized fields are stored as jsonb ({ en, ar }) to mirror the
 * frontend bilingual content model used across the public site.
 */
@Entity('blog_posts')
export class BlogPost extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  slug: string;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  title: Localized;

  @ApiProperty({ description: 'Category label/key' })
  @Column({ default: '' })
  category: string;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  excerpt: Localized;

  @ApiProperty({ type: Localized, description: 'Long-form body content' })
  @Column({ type: 'jsonb' })
  body: Localized;

  @ApiProperty({ description: 'Cover image filename or URL' })
  @Column({ default: '' })
  cover: string;

  @ApiProperty({ type: [String], description: 'Supporting article image filenames or URLs' })
  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  gallery: string[];

  @ApiProperty()
  @Column({ default: '' })
  author: string;

  @ApiProperty({ enum: BlogStatus })
  @Column({ type: 'enum', enum: BlogStatus, default: BlogStatus.Published })
  status: BlogStatus;

  @ApiProperty({ required: false })
  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date | null;

  @ApiProperty({ type: Localized, required: false })
  @Column({ name: 'seo_title', type: 'jsonb', nullable: true })
  seoTitle: Localized | null;

  @ApiProperty({ type: Localized, required: false })
  @Column({ name: 'seo_description', type: 'jsonb', nullable: true })
  seoDescription: Localized | null;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
