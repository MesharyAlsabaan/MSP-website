import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('newsletter_subscribers')
export class Subscriber extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  email: string;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;
}
