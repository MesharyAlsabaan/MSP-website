import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum VendorTokenPurpose {
  VerifyEmail = 'verify_email',
  ResetPassword = 'reset_password',
}

/**
 * One-time tokens emailed to vendors (email verification, password reset).
 * Only the SHA-256 is stored; issuing a new token voids older unused ones of
 * the same purpose.
 */
@Entity('vendor_account_tokens')
export class VendorAccountToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'account_id', type: 'uuid' })
  accountId: string;

  @Column({ type: 'enum', enum: VendorTokenPurpose })
  purpose: VendorTokenPurpose;

  @Index({ unique: true })
  @Column({ name: 'token_hash', length: 64 })
  tokenHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
