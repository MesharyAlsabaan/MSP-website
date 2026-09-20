import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Monotonic counters behind SUP-000123 and REQ-2026-0042. Rows are read with
 * `FOR UPDATE` inside the submitting transaction, so two simultaneous
 * registrations can never draw the same number, and a number is never reused.
 * `scope` is 'vendor' or 'request:<year>'.
 */
@Entity('vendor_counters')
export class VendorCounter {
  @PrimaryColumn({ length: 32 })
  scope: string;

  @Column({ name: 'last_value', type: 'integer', default: 0 })
  lastValue: number;
}
