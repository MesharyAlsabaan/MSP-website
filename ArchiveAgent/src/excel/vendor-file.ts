import ExcelJS from 'exceljs';
import { rename, unlink } from 'fs/promises';
import { FileLockedError } from './register';

export interface VendorFileInput {
  vendorNumber: string;
  requestNumber: string;
  revisionNo: number;
  approvedAt: string;
  approvedBy: string;
  decisionNote: string;
  submittedAt: string;
  categoryName: string;
  secondaryCategories: string[];
  profile: Record<string, string | string[] | undefined>;
  documents: { typeName: string; relativePath: string; originalFilename: string; sizeBytes: number; sha256: string; expiresAt: string | null }[];
  decisions: { revisionNo: number; decidedAt: string; decidedBy: string; note: string }[];
}

const PROFILE_LABELS: [string, string][] = [
  ['companyName', 'اسم الشركة'],
  ['companyNameEn', 'الاسم بالإنجليزية'],
  ['specialty', 'التخصص'],
  ['contactName', 'مسؤول التواصل'],
  ['phone', 'الهاتف'],
  ['mobile', 'الجوال'],
  ['email', 'البريد الإلكتروني'],
  ['city', 'المدينة'],
  ['address', 'العنوان'],
  ['commercialRegistrationNo', 'السجل التجاري'],
  ['vatNo', 'الرقم الضريبي'],
  ['website', 'الموقع الإلكتروني'],
  ['notes', 'ملاحظات المورد'],
];

const rtl = { views: [{ rightToLeft: true }] };

/**
 * Writes `بيانات المورد.xlsx` for one approved revision: a data sheet, a
 * documents sheet with RELATIVE hyperlinks (so the folder can be moved or
 * copied and links keep working), and the decision history. Written whole
 * each time via temp + rename.
 */
export async function writeVendorFile(file: string, input: VendorFileInput): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MSP Archive Agent';

  const data = wb.addWorksheet('بيانات المورد', rtl);
  data.columns = [{ width: 26 }, { width: 60 }];
  const kv = (k: string, v: string) => data.addRow([k, v]);
  kv('رقم المورد', input.vendorNumber);
  kv('رقم الطلب', input.requestNumber);
  kv('الإصدار المعتمد', `v${input.revisionNo}`);
  kv('تاريخ الإرسال', input.submittedAt);
  kv('تاريخ الاعتماد', input.approvedAt);
  kv('المعتمِد', input.approvedBy);
  kv('ملاحظة الاعتماد', input.decisionNote);
  kv('التصنيف', input.categoryName);
  kv('تصنيفات ثانوية', input.secondaryCategories.join('، '));
  data.addRow([]);
  for (const [key, label] of PROFILE_LABELS) {
    const v = input.profile[key];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    kv(label, Array.isArray(v) ? v.join('، ') : String(v));
  }
  data.getColumn(1).font = { bold: true };

  const docs = wb.addWorksheet('المستندات', rtl);
  docs.columns = [
    { header: 'نوع المستند', width: 28 },
    { header: 'الملف', width: 44 },
    { header: 'تاريخ الانتهاء', width: 14 },
    { header: 'الحجم (KB)', width: 12 },
    { header: 'SHA-256', width: 66 },
  ];
  docs.getRow(1).font = { bold: true };
  for (const d of input.documents) {
    const r = docs.addRow([d.typeName, '', d.expiresAt ?? '', Math.round(d.sizeBytes / 1024), d.sha256]);
    // Relative, unencoded, forward slashes: Excel resolves it against the workbook's folder.
    r.getCell(2).value = { text: d.originalFilename, hyperlink: d.relativePath.replace(/\\/g, '/'), tooltip: d.relativePath };
  }

  const dec = wb.addWorksheet('سجل الاعتماد', rtl);
  dec.columns = [
    { header: 'الإصدار', width: 10 },
    { header: 'تاريخ الاعتماد', width: 22 },
    { header: 'المعتمِد', width: 22 },
    { header: 'ملاحظة', width: 60 },
  ];
  dec.getRow(1).font = { bold: true };
  for (const d of input.decisions) dec.addRow([`v${d.revisionNo}`, d.decidedAt, d.decidedBy, d.note]);

  const tmp = `${file}.${process.pid}.tmp`;
  try {
    await wb.xlsx.writeFile(tmp);
    await rename(tmp, file);
  } catch (err) {
    await unlink(tmp).catch(() => undefined);
    if (['EBUSY', 'EPERM', 'EACCES'].includes((err as NodeJS.ErrnoException).code ?? '')) throw new FileLockedError(file, err);
    throw err;
  }
}
