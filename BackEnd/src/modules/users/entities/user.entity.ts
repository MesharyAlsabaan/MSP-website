import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { Role } from '../../../common/enums/role.enum';

@Entity('users')
export class User extends BaseEntity {
  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @ApiProperty()
  @Column()
  name: string;

  /** Bcrypt hash — never serialised to API responses. */
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'enum', enum: Role, default: Role.Editor })
  role: Role;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;
}
