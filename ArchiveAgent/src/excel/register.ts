import ExcelJS from 'exceljs';
import { access, rename, unlink } from 'fs/promises';
import { pathToFileURL } from 'url';

export interface RegisterRow {
  vendorNumber: string;
  requestNumber: string;
  revisionNo: number;
  companyName: string;
  categoryName: string;
  secondaryCategories: string;
  specialty: string;
  contactName: string;
  phone: string;
  mobile: string;
  email: string;
  city: string;
  address: string;
  commercialRegistrationNo: string;
  vatNo: string;
  approvedAt: string;
  approvedBy: string;
  earliestExpiry: string;
  folderPath: string;
  updatedAt: string;
}

export const REGISTER_COLUMNS: { key: keyof RegisterRow; header: string; width: number }[] = [
  { key: 'vendorNumber', header: 'رقم المورد', width: 14 },
  { key: 'requestNumber', header: 'رقم الطلب', width: 16 },
  { key: 'revisionNo', header: 'الإصدار', width: 9 },
  { key: 'companyName', header: 'اسم الشركة', width: 36 },
  { key: 'categoryName', header: 'التصنيف', width: 24 },
  { key: 'secondaryCategories', header: 'تصنيفات ثانوية', width: 24 },
  { key: 'specialty', header: 'التخصص', width: 24 },
  { key: 'contactName', header: 'مسؤول التواصل', width: 22 },
  { key: 'phone', header: 'الهاتف', width: 16 },
  { key: 'mobile', header: 'الجوال', width: 16 },
  { key: 'email', header: 'البريد', width: 28 },
  { key: 'city', header: 'المدينة', width: 14 },
  { key: 'address', header: 'العنوان', width: 36 },
  { key: 'commercialRegistrationNo', header: 'السجل التجاري', width: 16 },
  { key: 'vatNo', header: 'الرقم الضريبي', width: 18 },
  { key: 'approvedAt', header: 'تاريخ الاعتماد', width: 14 },
  { key: 'approvedBy', header: 'المعتمِد', width: 20 },
  { key: 'earliestExpiry', header: 'أقرب انتهاء وثيقة', width: 16 },
  { key: 'folderPath', header: 'مجلد المورد', width: 22 },
  { key: 'updatedAt', header: 'آخر تحديث', width: 22 },
];

const SHEET = 'الموردون';

/** The register (or a vendor file) is open in Excel or otherwise locked; retry later. */
export class FileLockedError extends Error {
  constructor(public readonly file: string, cause: unknown) {
    super(`File is locked (open in Excel?): ${file} — ${(cause as Error)?.message ?? cause}`);
    this.name = 'FileLockedError';
  }
}

const isLockError = (err: unknown): boolean => ['EBUSY', 'EPERM', 'EACCES'].includes((err as NodeJS.ErrnoException)?.code ?? '');

function exists(path: string): Promise<boolean> {
  return access(path).then(() => true, () => false);
}

function folderLink(path: string): string {
  // file:///C:/… for local paths, file://Server/share/… for UNC — both open in Explorer.
  return path.startsWith('\\\\') ? `file:${path.replace(/\\/g, '/')}` : pathToFileURL(path).href;
}

/**
 * Inserts or updates the row whose "رقم المورد" equals `row.vendorNumber`.
 * Read → modify in memory → write a sibling temp file → rename over the
 * original, so readers never see a half-written workbook. If Excel has the
 * file open the rename fails; that surfaces as FileLockedError and nothing
 * on disk changes (the temp file is removed).
 */
export async function upsertRegisterRow(file: string, row: RegisterRow): Promise<'inserted' | 'updated'> {
  const wb = new ExcelJS.Workbook();
  let ws: ExcelJS.Worksheet;
  if (await exists(file)) {
    try {
      await wb.xlsx.readFile(file);
    } catch (err) {
      if (isLockError(err)) throw new FileLockedError(file, err);
      throw err;
    }
    ws = wb.getWorksheet(SHEET) ?? wb.worksheets[0] ?? wb.addWorksheet(SHEET, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  } else {
    ws = wb.addWorksheet(SHEET, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  }

  if (ws.rowCount === 0 || !ws.getRow(1).getCell(1).value) {
    ws.columns = REGISTER_COLUMNS.map((c) => ({ key: c.key, header: c.header, width: c.width }));
    ws.getRow(1).font = { bold: true };
  } else {
    // keep existing column widths but make sure keys are mapped for lookups
    ws.columns = REGISTER_COLUMNS.map((c, i) => ({ key: c.key, header: c.header, width: ws.getColumn(i + 1).width ?? c.width }));
  }

  let target: ExcelJS.Row | undefined;
  ws.eachRow((r, n) => {
    if (n > 1 && String(r.getCell(1).value ?? '') === row.vendorNumber) target = r;
  });
  const result: 'inserted' | 'updated' = target ? 'updated' : 'inserted';
  if (!target) target = ws.addRow([]);

  for (const [i, c] of REGISTER_COLUMNS.entries()) {
    const v = row[c.key];
    target.getCell(i + 1).value =
      c.key === 'folderPath' && v ? { text: 'فتح المجلد', hyperlink: folderLink(String(v)), tooltip: String(v) } : (v as string | number);
  }
  target.commit();

  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await wb.xlsx.writeFile(tmp);
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    if (isLockError(err)) throw new FileLockedError(file, err);
    throw err;
  }
  return result;
}
