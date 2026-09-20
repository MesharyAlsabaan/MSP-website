import { decodeMultipartFilename } from './filename-encoding';

describe('decodeMultipartFilename', () => {
  it('repairs a UTF-8 name that busboy decoded as latin1', () => {
    const mangled = Buffer.from('السجل التجاري.pdf', 'utf8').toString('latin1');
    expect(decodeMultipartFilename(mangled)).toBe('السجل التجاري.pdf');
  });

  it('leaves plain ASCII and already-correct Unicode names alone', () => {
    expect(decodeMultipartFilename('profile.pdf')).toBe('profile.pdf');
    expect(decodeMultipartFilename('شهادة.pdf')).toBe('شهادة.pdf');
  });

  it('does not corrupt a genuine latin1 name that is not valid UTF-8', () => {
    expect(decodeMultipartFilename('résumé.pdf')).toBe('résumé.pdf');
  });
});
