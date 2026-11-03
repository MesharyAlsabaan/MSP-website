import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('settings')
export class Setting extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column()
  key: string;

  @ApiProperty()
  @Column({ type: 'jsonb', nullable: true })
  value: any;
}
