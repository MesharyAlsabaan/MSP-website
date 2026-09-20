import ExcelJS from 'exceljs';
import { closeSync, mkdtempSync, openSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { FileLockedError, upsertRegisterRow, REGISTER_COLUMNS, RegisterRow } from './register';

const row = (over: Partial<RegisterRow> = {}): RegisterRow => ({
  vendorNumber: 'SUP-000001',
  requestNumber: 'REQ-2026-0001',
  revisionNo: 1,
  companyName: 'شركة أ',
  categoryName: 'مقاولون عامون',
  secondaryCategories: 'كهرباء',
  specialty: '',
  contactName: 'أحمد',
  phone: '',
  mobile: '0500000000',
  email: 'a@example.test',
  city: 'الرياض',
  address: '',
  commercialRegistrationNo: '1010',
  vatNo: '',
  approvedAt: '2026-09-20',
  approvedBy: 'م. منصور',
  earliestExpiry: '2026-12-31',
  folderPath: '\\\\Server\\Contracting\\x\\SUP-000001 - شركة أ',
  updatedAt: '2026-09-20T10:00:00Z',
  ...over,
});

async function readRows(file: string): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(file);
  const ws = wb.worksheets[0];
  const out: string[][] = [];
  ws.eachRow((r) => out.push((r.values as unknown[]).slice(1).map((v) => (v && typeof v === 'object' && 'text' in (v as object) ? String((v as { text: string }).text) : String(v ?? '')))));
  return out;
}

describe('upsertRegisterRow', () => {
  let dir: string;
  beforeEach(() => (dir = mkdtempSync(join(tmpdir(), 'msp-reg-'))));
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('creates the register with a header row and the first vendor', async () => {
    const file = join(dir, 'سجل الموردين.xlsx');
    await upsertRegisterRow(file, row());
    const rows = await readRows(file);
    expect(rows[0]).toEqual(REGISTER_COLUMNS.map((c) => c.header));
    expect(rows[1][0]).toBe('SUP-000001');
    expect(rows).toHaveLength(2);
    expect(readdirSync(dir)).toEqual(['سجل الموردين.xlsx']); // no temp file left
  });

  it('updates the existing row for the same vendor number instead of adding one', async () => {
    const file = join(dir, 'r.xlsx');
    await upsertRegisterRow(file, row());
    await upsertRegisterRow(file, row({ vendorNumber: 'SUP-000002', companyName: 'شركة ب' }));
    await upsertRegisterRow(file, row({ companyName: 'شركة أ المحدثة', revisionNo: 2 }));
    const rows = await readRows(file);
    expect(rows).toHaveLength(3);
    expect(rows[1][3]).toBe('شركة أ المحدثة');
    expect(rows[1][2]).toBe('2');
    expect(rows[2][0]).toBe('SUP-000002');
  });

  it('writes the folder as a clickable hyperlink', async () => {
    const file = join(dir, 'r.xlsx');
    await upsertRegisterRow(file, row());
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const idx = REGISTER_COLUMNS.findIndex((c) => c.key === 'folderPath') + 1;
    const cell = wb.worksheets[0].getRow(2).getCell(idx);
    expect((cell.value as { hyperlink: string }).hyperlink).toMatch(/^file:/);
  });

  it('reports a locked file as FileLockedError and leaves the original untouched', async () => {
    const file = join(dir, 'r.xlsx');
    await upsertRegisterRow(file, row());
    // Emulate Excel holding the file: an exclusive open handle on Windows blocks rename-over.
    const fd = openSync(file, 'r+');
    try {
      if (process.platform === 'win32') {
        await expect(upsertRegisterRow(file, row({ companyName: 'x' }))).rejects.toThrow(FileLockedError);
      }
    } finally {
      closeSync(fd);
    }
    const rows = await readRows(file);
    expect(rows[1][3]).toBe(process.platform === 'win32' ? 'شركة أ' : 'x');
    expect(readdirSync(dir).filter((f) => f.includes('tmp'))).toHaveLength(0);
  });
});
