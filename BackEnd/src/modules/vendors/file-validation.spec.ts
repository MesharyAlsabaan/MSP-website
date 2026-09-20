import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { detectMime, validateUpload, UPLOAD_LIMITS } from './file-validation';

const PDF = Buffer.from('%PDF-1.7\n%âãÏÓ\n1 0 obj');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const ZIP = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
const EXE = Buffer.from('MZ\x90\x00\x03');

describe('detectMime', () => {
  it('recognises the allowed document types by their magic bytes', () => {
    expect(detectMime(PDF, 'a.pdf')).toBe('application/pdf');
    expect(detectMime(PNG, 'a.png')).toBe('image/png');
    expect(detectMime(JPG, 'a.jpeg')).toBe('image/jpeg');
    expect(detectMime(ZIP, 'a.docx')).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(detectMime(ZIP, 'a.xlsx')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });

  it('returns null when the bytes and the extension disagree', () => {
    expect(detectMime(EXE, 'a.pdf')).toBeNull();
    expect(detectMime(PDF, 'a.png')).toBeNull();
    expect(detectMime(ZIP, 'a.zip')).toBeNull();
  });
});

describe('validateUpload', () => {
  it('accepts a well-formed PDF within limits', () => {
    expect(validateUpload({ originalname: 'cr.pdf', buffer: PDF, size: PDF.length })).toEqual({
      mime: 'application/pdf',
    });
  });

  it('rejects a disguised executable', () => {
    expect(() => validateUpload({ originalname: 'cr.pdf', buffer: EXE, size: EXE.length })).toThrow(
      BadRequestException,
    );
  });

  it('rejects an empty file', () => {
    expect(() => validateUpload({ originalname: 'x.pdf', buffer: Buffer.alloc(0), size: 0 })).toThrow(
      BadRequestException,
    );
  });

  it('rejects a file over the per-file limit', () => {
    const big = { originalname: 'x.pdf', buffer: PDF, size: UPLOAD_LIMITS.maxFileBytes + 1 };
    expect(() => validateUpload(big)).toThrow(PayloadTooLargeException);
  });

  it('rejects when the revision total would exceed the limit', () => {
    expect(() =>
      validateUpload({ originalname: 'x.pdf', buffer: PDF, size: 10 }, UPLOAD_LIMITS.maxRevisionBytes - 5),
    ).toThrow(PayloadTooLargeException);
  });
});
