import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Credential for one office archive agent. The plaintext key is shown once
 * when created and only its SHA-256 is kept. `lastHeartbeat` is what the
 * admin status screen shows (last success, pending count, recent errors).
 */
@Entity('archive_agent_keys')
export class ArchiveAgentKey extends BaseEntity {
  @ApiProperty({ example: 'office-server-1' })
  @Column({ length: 128 })
  name: string;

  @Index({ unique: true })
  @Column({ name: 'key_hash', length: 64, select: false })
  keyHash: string;

  @ApiProperty()
  @Column({ default: true })
  active: boolean;

  @ApiProperty({ required: false })
  @Column({ name: 'last_seen_at', type: 'timestamptz', nullable: true })
  lastSeenAt: Date | null;

  @ApiProperty({ required: false })
  @Column({ name: 'last_heartbeat', type: 'jsonb', nullable: true })
  lastHeartbeat: Record<string, unknown> | null;
}
