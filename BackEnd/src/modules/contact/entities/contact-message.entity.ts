import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('contact_messages')
export class ContactMessage extends BaseEntity {
  @ApiProperty() @Column() name: string;
  @ApiProperty() @Column() email: string;
  @ApiProperty({ required: false }) @Column({ default: '' }) phone: string;
  @ApiProperty({ required: false }) @Column({ default: '' }) subject: string;
  @ApiProperty() @Column({ type: 'text' }) message: string;
  @ApiProperty() @Column({ default: false }) read: boolean;
}
