import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';

export const formatVendorNumber = (n: number): string => `SUP-${String(n).padStart(6, '0')}`;
export const formatRequestNumber = (year: number, n: number): string =>
  `REQ-${year}-${String(n).padStart(4, '0')}`;

/**
 * Issues SUP-000123 / REQ-2026-0042 from the `vendor_counters` table. A single
 * INSERT … ON CONFLICT … RETURNING statement increments atomically, so
 * concurrent callers (or several app replicas) never receive the same value,
 * and a value is never reused. Pass the transaction's EntityManager so the
 * number is taken inside the same transaction as the row that uses it.
 */
@Injectable()
export class NumberingService {
  async nextVendorNumber(manager: EntityManager): Promise<string> {
    return formatVendorNumber(await this.bump(manager, 'vendor'));
  }

  async nextRequestNumber(manager: EntityManager, now: Date = new Date()): Promise<string> {
    const year = now.getFullYear();
    return formatRequestNumber(year, await this.bump(manager, `request:${year}`));
  }

  private async bump(manager: EntityManager, scope: string): Promise<number> {
    // Raw SQL does not inherit TypeORM's schema option on every pooled
    // connection, so the table is qualified explicitly.
    const schema = (manager.connection.options as { schema?: string }).schema ?? 'public';
    const table = `"${schema}".vendor_counters`;
    const rows: { last_value: number }[] = await manager.query(
      `INSERT INTO ${table} (scope, last_value) VALUES ($1, 1)
       ON CONFLICT (scope) DO UPDATE SET last_value = ${table}.last_value + 1
       RETURNING last_value`,
      [scope],
    );
    return Number(rows[0].last_value);
  }
}
