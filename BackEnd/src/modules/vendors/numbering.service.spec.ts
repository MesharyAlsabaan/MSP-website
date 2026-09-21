import { DataSource } from 'typeorm';
import { openVendorTestDb } from '../../test/test-db';
import { formatRequestNumber, formatVendorNumber, NumberingService } from './numbering.service';

describe('number formats', () => {
  it('pads the vendor number to six digits', () => {
    expect(formatVendorNumber(123)).toBe('SUP-000123');
    expect(formatVendorNumber(1234567)).toBe('SUP-1234567');
  });

  it('pads the request number to four digits within its year', () => {
    expect(formatRequestNumber(2026, 42)).toBe('REQ-2026-0042');
    expect(formatRequestNumber(2026, 12345)).toBe('REQ-2026-12345');
  });
});

describe('NumberingService (database)', () => {
  let ds: DataSource;
  let close: () => Promise<void>;
  const svc = new NumberingService();

  beforeAll(async () => {
    ({ ds, close } = await openVendorTestDb());
  }, 60000);
  afterAll(async () => close());

  it('issues consecutive vendor numbers starting at 1', async () => {
    expect(await svc.nextVendorNumber(ds.manager)).toBe('SUP-000001');
    expect(await svc.nextVendorNumber(ds.manager)).toBe('SUP-000002');
  });

  it('keeps a separate request counter per year', async () => {
    expect(await svc.nextRequestNumber(ds.manager, new Date('2026-03-01'))).toBe('REQ-2026-0001');
    expect(await svc.nextRequestNumber(ds.manager, new Date('2026-11-01'))).toBe('REQ-2026-0002');
    expect(await svc.nextRequestNumber(ds.manager, new Date('2027-01-05'))).toBe('REQ-2027-0001');
  });

  it('never hands two concurrent callers the same number', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 20 }, () => svc.nextVendorNumber(ds.manager)),
    );
    expect(new Set(numbers).size).toBe(20);
  });
});
