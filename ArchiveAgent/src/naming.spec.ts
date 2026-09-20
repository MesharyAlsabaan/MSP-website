import { safeFileName, safeFolderName, vendorFolderName } from './naming';

describe('naming', () => {
  it('keeps Arabic and strips characters Windows forbids', () => {
    expect(safeFolderName('شركة "البناء" <الحديث>: أ/ب\\ج|د*هـ?')).toBe('شركة البناء الحديث أ ب ج د هـ');
  });

  it('collapses whitespace and trailing dots/spaces (Windows rejects them)', () => {
    expect(safeFolderName('  Acme   Co.  ')).toBe('Acme Co');
    expect(safeFolderName('name...')).toBe('name');
  });

  it('refuses reserved device names', () => {
    expect(safeFolderName('CON')).toBe('_CON');
    expect(safeFileName('aux.pdf')).toBe('_aux.pdf');
  });

  it('caps length while keeping the extension of a file name', () => {
    const long = 'أ'.repeat(300) + '.pdf';
    const out = safeFileName(long);
    expect(out.endsWith('.pdf')).toBe(true);
    expect(out.length).toBeLessThanOrEqual(120);
  });

  it('falls back when nothing usable is left', () => {
    expect(safeFolderName('???')).toBe('_');
    expect(safeFileName('<>.pdf')).toBe('_.pdf');
  });

  it('builds the vendor folder name from the number and the company', () => {
    expect(vendorFolderName('SUP-000123', 'مؤسسة الرخام / الملكي')).toBe('SUP-000123 - مؤسسة الرخام الملكي');
  });
});
