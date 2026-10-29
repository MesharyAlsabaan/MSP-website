import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { ARABIC, FACT_KEYS, ProjectDraft, VERIFIED_SOURCES } from './draft';

/**
 * Optional AI step that writes a project's bilingual text, so nobody has to
 * type descriptions. Off unless ANTHROPIC_API_KEY is set; without it the
 * page gets a one-line summary built from the facts (draft.ts fallbackText).
 *
 * The model sees: the folder name, the sub-folder and file names, the
 * verified facts and up to MAX_IMAGES downscaled images. It returns:
 *  - the Arabic title and location: renderings of the verified English ones,
 *    nothing more (it adds no fact of its own);
 *  - visual notes (what the images show), for the admin only;
 *  - summary and description in both languages, written from the facts and
 *    the visible design only.
 *
 * The text is then checked mechanically (checkText): no number that is not
 * in the facts, no area, award, certification, client, contractor or cost
 * wording, the right script, matching paragraph counts. Output that fails is
 * discarded, the fallback summary is kept, and the reason is reported.
 *
 * Cost: one request per new project (and when its title or images change):
 * about 6 images + 2K tokens in, 2–4K out — roughly US$0.05–0.10 on claude-opus-5-5.
 */

export const MAX_IMAGES = 6;

const SYSTEM = `You write website project pages for MSP, an architecture and engineering design consultancy in Riyadh (it designs and supervises; it is never a contractor or builder). You write in English and in Arabic. The pages are published without further review, so accuracy matters more than anything else.

You receive a project folder's name, the names of its sub-folders and files, the verified facts, and a few of its images (renderings or photographs).

Arabic title and location:
- title_ar: the Arabic rendering of the English title as an established Saudi practice would write it (transliterate proper names; translate descriptive words). location_ar: the Arabic of the given English location, or empty when no location is given. Add nothing.

Text:
- summary: one or two sentences, 70–170 characters, usable as the page's meta description. description: 1–3 short paragraphs.
- Use only the facts given and design features clearly visible in the images (massing, façade treatment, materials as they appear, light, spatial organisation). Do not state a location, use, sector, client, date, size, floor count, budget, status, award, certification, performance or sustainability claim that is not in the facts. Never use outside knowledge about the project.
- No digits unless the number is in the facts.
- Plain, precise, professional tone; no superlatives ("stunning", "world-class", "luxurious" are banned). Arabic: natural Modern Standard Arabic suited to an established Saudi consultancy, not a word-for-word translation; the same number of paragraphs as the English.
- If studio text is given for a field, keep its meaning and only render the other language.

visual_notes: 3–8 short notes on what the images show, for the studio's admin screen.

Return JSON only, matching the schema.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title_ar', 'location_ar', 'visual_notes', 'summary_en', 'summary_ar', 'description_en', 'description_ar'],
  properties: {
    title_ar: { type: 'string' },
    location_ar: { type: 'string' },
    visual_notes: { type: 'array', items: { type: 'string' } },
    summary_en: { type: 'string' },
    summary_ar: { type: 'string' },
    description_en: { type: 'array', items: { type: 'string' } },
    description_ar: { type: 'array', items: { type: 'string' } },
  },
} as const;

export interface DrafterOutput {
  title_ar: string;
  location_ar: string;
  visual_notes: string[];
  summary_en: string;
  summary_ar: string;
  description_en: string[];
  description_ar: string[];
}

/** Claims the text may not make on its own; facts would have to carry them. */
const BANNED_EN = /\b(leed|award|awarded|certif\w*|sq\.?\s?m|m²|square met\w*|contractor|built by|constructed by|client|budget|cost|sustainab\w*|energy[- ]efficien\w*|stunning|world[- ]class|luxurious)\b/i;
const BANNED_AR = /(جائزة|جوائز|شهادة|ليد|متر مربع|م²|مقاول|العميل|ميزانية|تكلفة|استدام|موفر للطاقة|فاخر)/;

/**
 * Mechanical checks on generated text. Returns problems; empty = acceptable.
 * `allowed` is the text of the verified facts: a number may appear only if it is there.
 */
export function checkText(out: Pick<DrafterOutput, 'summary_en' | 'summary_ar' | 'description_en' | 'description_ar'>, allowed: string): string[] {
  const problems: string[] = [];
  const en = [out.summary_en, ...out.description_en].join('\n');
  const ar = [out.summary_ar, ...out.description_ar].join('\n');
  if (!out.summary_en.trim() || ARABIC.test(en)) problems.push('English text missing or not in English');
  if (!out.summary_ar.trim() || !ARABIC.test(out.summary_ar) || out.description_ar.some((p) => !ARABIC.test(p))) problems.push('Arabic text missing or not in Arabic');
  if (out.summary_en.length > 220 || out.summary_ar.length > 220) problems.push('summary longer than 220 characters');
  if (out.description_en.length !== out.description_ar.length) problems.push('English and Arabic descriptions have different paragraph counts');
  if (out.description_en.length > 4) problems.push('description longer than 4 paragraphs');
  const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const numbers = toLatin(`${en}\n${ar}`).match(/\d+/g) ?? [];
  const allowedNumbers = new Set(toLatin(allowed).match(/\d+/g) ?? []);
  const stray = [...new Set(numbers.filter((n) => !allowedNumbers.has(n)))];
  if (stray.length) problems.push(`numbers not in the facts: ${stray.join(', ')}`);
  const bannedEn = en.match(BANNED_EN);
  if (bannedEn) problems.push(`unsupported claim wording: "${bannedEn[0]}"`);
  const bannedAr = ar.match(BANNED_AR);
  if (bannedAr) problems.push(`unsupported claim wording: "${bannedAr[0]}"`);
  return problems;
}

/** Merges the AI's output into the draft: it never replaces a verified fact or text a person wrote. */
export function mergeOutput(draft: ProjectDraft, out: DrafterOutput, model: string, textProblems: string[]): void {
  const f = draft.facts;
  const render = (key: 'titleAr' | 'locationAr', value: string, of: string) => {
    if (VERIFIED_SOURCES.includes(f[key].source) && f[key].value) return;
    if (!of || !value.trim() || !ARABIC.test(value)) return;
    f[key] = { value: value.trim(), source: 'ai', basis: `Arabic rendering of "${of}"` };
  };
  render('titleAr', out.title_ar, f.titleEn.value);
  render('locationAr', out.location_ar, f.locationEn.value);

  draft.visualNotes = out.visual_notes.map((n) => n.trim()).filter(Boolean).slice(0, 10);
  draft.ai = { model, at: new Date().toISOString() };

  if (textProblems.length) {
    draft.notes.push(`AI text discarded: ${textProblems.join('; ')}. The factual summary is used instead.`);
    return;
  }
  const c = draft.content;
  const human = (k: keyof typeof c) => c[k].source === 'owner';
  if (!human('summaryEn')) c.summaryEn = { value: out.summary_en.trim(), source: 'ai' };
  if (!human('summaryAr')) c.summaryAr = { value: out.summary_ar.trim(), source: 'ai' };
  if (!human('descriptionEn')) c.descriptionEn = { value: out.description_en.map((p) => p.trim()).filter(Boolean), source: 'ai' };
  if (!human('descriptionAr')) c.descriptionAr = { value: out.description_ar.map((p) => p.trim()).filter(Boolean), source: 'ai' };
}

export class Drafter {
  private readonly logger = new Logger(Drafter.name);
  private readonly client?: Anthropic;
  readonly model = process.env.PROJECT_SYNC_AI_MODEL || 'claude-opus-5-5';

  constructor(apiKey = process.env.ANTHROPIC_API_KEY) {
    if (apiKey) this.client = new Anthropic({ apiKey, maxRetries: 3, timeout: 180_000 });
  }

  get enabled(): boolean {
    return !!this.client;
  }

  /**
   * Drafts into `draft` in place. `images` are JPEGs already downscaled for
   * the model. Throws on API failure; text that fails the checks is dropped
   * with a note instead.
   */
  async draft(folderName: string, paths: string[], draft: ProjectDraft, images: Buffer[]): Promise<void> {
    if (!this.client) return;

    // Only verified facts are given: the text cannot lean on anything else.
    const known = Object.fromEntries(
      FACT_KEYS.filter((k) => VERIFIED_SOURCES.includes(draft.facts[k].source))
        .map((k) => [k, draft.facts[k].value])
        .filter(([, v]) => (Array.isArray(v) ? v.length : v)),
    );
    const studioText = Object.fromEntries(
      (['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const)
        .filter((k) => draft.content[k].source === 'owner')
        .map((k) => [k, draft.content[k].value]),
    );
    // Folder structure tells the model about the scope (floors, rooms, interiors); file names are trimmed.
    const dirs = [...new Set(paths.map((p) => p.split('/').slice(0, -1).join('/')).filter(Boolean))].slice(0, 60);
    const files = paths.slice(0, 40).map((p) => p.split('/').pop());

    const content: Anthropic.Beta.BetaContentBlockParam[] = images.slice(0, MAX_IMAGES).map((data) => ({
      type: 'image' as const,
      source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data: data.toString('base64') },
    }));
    content.push({
      type: 'text',
      text: [
        `Folder: ${folderName}`,
        `Sub-folders: ${dirs.length ? dirs.join(' | ') : '(none)'}`,
        `Sample file names: ${files.join(' | ')}`,
        `Verified facts: ${JSON.stringify(known)}`,
        Object.keys(studioText).length ? `Studio text to keep: ${JSON.stringify(studioText)}` : 'No studio text: write the summary and description.',
        `The ${content.length} image(s) above are from this folder.`,
      ].join('\n'),
    });

    const response = await this.client.beta.messages.create({
      model: this.model,
      max_tokens: 16000,
      system: SYSTEM,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'medium', format: { type: 'json_schema', schema: SCHEMA } },
      messages: [{ role: 'user', content }],
    });

    if (response.stop_reason === 'refusal') throw new Error('The AI declined to draft this project');
    if (response.stop_reason === 'max_tokens') throw new Error('The AI draft was cut off');
    const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
    const out = JSON.parse(text) as DrafterOutput;

    const verified = FACT_KEYS.filter((k) => VERIFIED_SOURCES.includes(draft.facts[k].source)).map((k) => JSON.stringify(draft.facts[k].value));
    const problems = checkText(out, [folderName, ...verified].join(' '));
    mergeOutput(draft, out, this.model, problems);
    this.logger.log(`Drafted ${folderName}${problems.length ? ` (text discarded: ${problems.join('; ')})` : ''}`);
  }
}
