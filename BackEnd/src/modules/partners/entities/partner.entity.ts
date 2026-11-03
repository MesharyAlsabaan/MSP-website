import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Partner / client logo shown on the site. Not bilingual — plain string columns.
 */
@Entity('partners')
export class Partner extends BaseEntity {
  @ApiProperty()
  @Column()
  name: string;

  @ApiProperty({ description: 'Logo filename or URL' })
  @Column({ default: '' })
  logo: string;

  @ApiProperty({ description: 'Partner website URL' })
  @Column({ default: '' })
  url: string;

  @ApiProperty()
  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;
}
