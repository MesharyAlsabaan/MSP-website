/** Left-to-right isolate (U+2066) and pop-directional-isolate (U+2069). */
const LRI = '⁦';
const PDI = '⁩';

/**
 * Wraps numeric runs such as times and ranges (`9:00–18:00`, `2010–2026`) in
 * a left-to-right isolate, so an Arabic sentence doesn't reorder them into
 * `18:00–9:00`. Safe on English text and idempotent.
 */
export function isolateNumbers(text: string): string {
  if (text.includes(LRI)) return text;
  return text.replace(/\d[\d:.,]*(?:\s*[–\-/]\s*\d[\d:.,]*)*/g, (run) => `${LRI}${run}${PDI}`);
}
