import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * A vendor's login. Completely separate from staff users (different table,
 * different token audience, no roles): a vendor account can only ever reach
 * its own vendor record and application.
 */
@Entity('vendor_accounts')
export class VendorAccount extends BaseEntity {
  @ApiProperty()
  @Index({ unique: true })
  @Column({ length: 254 })
  email: string;

  /** bcrypt hash — never serialised. */
  @Column({ name: 'password_hash', select: false })
  passwordHash: string;

  @ApiProperty()
  @Column({ name: 'contact_name', length: 200 })
  contactName: string;

  @ApiProperty({ required: false })
  @Column({ name: 'email_verified_at', type: 'timestamptz', nullable: true })
  emailVerifiedAt: Date | null;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;

  @ApiProperty({ required: false })
  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;
}
