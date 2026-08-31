import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Localized } from '../../../common/types/localized.type';

/** A taxonomy term as stored: a stable key plus its two labels. */
export interface Term {
  key: string;
  en: string;
  ar: string;
}

export enum ProjectStatus {
  Draft = 'draft',
  Published = 'published',
}

/**
 * Portfolio project. Localized fields are stored as jsonb ({ en, ar }) to
 * mirror the frontend `Project` model in core/data/projects.ts.
 */
@Entity('projects')
export class Project extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  slug: string;

  @ApiProperty({ description: 'Index numeral shown in the UI, e.g. "01"' })
  @Column({ default: '00' })
  no: string;

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  title: Localized;

  @ApiProperty({ description: 'Legacy single { key, en, ar } category; fallback sector' })
  @Column({ type: 'jsonb' })
  typology: Term;

  /*
   * Three independent axes. The first two are the works page's two filter rows
   * and are crossed, not merged — Interiors + Hospitality means both. A project
   * belongs to several of each and still shows from ONE record, never a copy.
   * The third is the scope MSP carried, shown on the project page only.
   */

  @ApiProperty({ description: 'Design fields — Architecture, Interiors, …', required: false })
  @Column({ name: 'design_categories', type: 'jsonb', default: () => "'[]'" })
  designCategories: Term[];

  @ApiProperty({ description: 'Sectors — Culture, Residential, …', required: false })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  sectors: Term[];

  @ApiProperty({ description: 'Scope carried — Architectural Design, Supervision, …', required: false })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  disciplines: Term[];

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  location: Localized;

  @ApiProperty()
  @Column({ default: '' })
  year: string;

  @ApiProperty({ description: 'Cover image filename or URL' })
  @Column({ default: '' })
  cover: string;

  @ApiProperty({ type: [String] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  gallery: string[];

  @ApiProperty({ type: Localized })
  @Column({ type: 'jsonb' })
  summary: Localized;

  @ApiProperty({ type: [Localized] })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  description: Localized[];

  @ApiProperty({ description: 'Array of { label: L, value: L }' })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  specs: { label: Localized; value: Localized }[];

  @ApiProperty({ type: [Localized], description: 'Legacy free-text scope, superseded by disciplines' })
  @Column({ type: 'jsonb', default: () => "'[]'" })
  services: Localized[];

  @ApiProperty({ required: false })
  @Column({ name: 'client_name', default: '' })
  clientName: string;

  @ApiProperty({ required: false })
  @Column({ name: 'project_url', default: '' })
  projectUrl: string;

  @ApiProperty({ enum: ProjectStatus })
  @Column({ type: 'enum', enum: ProjectStatus, default: ProjectStatus.Published })
  status: ProjectStatus;

  @ApiProperty()
  @Column({ default: false })
  featured: boolean;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
