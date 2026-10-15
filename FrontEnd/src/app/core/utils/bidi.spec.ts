import { isolateNumbers } from './bidi';

describe('isolateNumbers', () => {
  it('isolates a time range inside Arabic text', () => {
    expect(isolateNumbers('الأحد–الخميس، 9:00–18:00')).toBe('الأحد–الخميس، ⁦9:00–18:00⁩');
  });

  it('is idempotent', () => {
    const once = isolateNumbers('9:00–17:00');
    expect(isolateNumbers(once)).toBe(once);
  });
});
