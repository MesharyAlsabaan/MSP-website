import Anthropic from '@anthropic-ai/sdk';
import { Logger } from '@nestjs/common';
import { ARABIC, CATEGORY_KEYS, DraftFacts, FACT_KEYS, Fact, ProjectDraft, SECTOR_KEYS, VERIFIED_SOURCES } from './draft';

/**
 * Optional AI step that writes a project's bilingual draft, so nobody has to
 * type descriptions. Off unless ANTHROPIC_API_KEY is set; without it the
 * draft keeps the folder-name suggestions and the text is written in the admin.
 *
 * The model sees: the folder name, the sub-folder and file names, the facts
 * already known (with their sources) and up to MAX_IMAGES downscaled images.
 * It returns:
 *  - fact SUGGESTIONS (title, Arabic title, location, sectors, categories),
 *    each stored as source `ai` — a person confirms them before publishing;
 *  - visual notes (what the images show), for the reviewer only;
 *  - summary and description in both languages, written from the facts and
 *    the visible design only.
 *
 * The text is then checked mechanically (checkText): no number that is not
 * in the facts, no area, award, certification, client, contractor or cost
 * wording, the right script, matching paragraph counts. Output that fails is
 * discarded and the reason is shown in the draft.
 *
 * Cost: one request per new project (and per manual "redraft"): about 6
 * images + 2K tokens in, 2–4K out — roughly US$0.05–0.10 on claude-opus-5-5.
 */

export const MAX_IMAGES = 6;

const SYSTEM = `You prepare website project pages for MSP, an architecture and engineering design consultancy in Riyadh (it designs and supervises; it is never a contractor or builder). You write in English and in Arabic.

You receive a project folder's name, the names of its sub-folders and files, the facts already known (each with its source), and a few of its images (renderings or photographs).

Facts — accuracy matters more than completeness:
- Suggest a title, an Arabic title, a location and the classification ONLY from what the folder and file names say or the images plainly show. Leave a field empty when it is not supported. Never use outside knowledge to guess a city, district, client, date or size.
- Keep facts whose source is owner, register or site exactly as given.
- sectors and design_categories must be keys from the lists in the schema.

Text:
- summary: one or two sentences, 70–170 characters, usable as the page's meta description. description: 1–3 short paragraphs.
- Write only from the facts and from design features clearly visible in the images (massing, façade treatment, materials as they appear, light, spatial organisation). Describe what is visible; do not claim performance, sustainability, awards, certifications, areas, floor counts, budgets, dates, clients, contractors or construction status unless they are in the facts.
- No digits unless the number is in the facts.
- Plain, precise, professional tone; no superlatives ("stunning", "world-class", "luxurious" are banned). Arabic: natural Modern Standard Arabic suited to an established Saudi consultancy, not a word-for-word translation; the same number of paragraphs as the English.
- If studio text is given for a field, keep its meaning and only render the other language.

visual_notes: 3–8 short notes on what the images show, for the reviewer.

Return JSON only, matching the schema.`;

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title_en', 'title_ar', 'location_en', 'location_ar', 'sectors', 'design_categories', 'basis', 'visual_notes', 'summary_en', 'summary_ar', 'description_en', 'description_ar'],
  properties: {
    title_en: { type: 'string' },
    title_ar: { type: 'string' },
    location_en: { type: 'string' },
    location_ar: { type: 'string' },
    sectors: { type: 'array', items: { type: 'string', enum: SECTOR_KEYS } },
    design_categories: { type: 'array', items: { type: 'string', enum: CATEGORY_KEYS } },
    basis: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'location', 'classification'],
      properties: { title: { type: 'string' }, location: { type: 'string' }, classification: { type: 'string' } },
    },
    visual_notes: { type: 'array', items: { type: 'string' } },
    summary_en: { type: 'string' },
    summary_ar: { type: 'string' },
    description_en: { type: 'array', items: { type: 'string' } },
    description_ar: { type: 'array', items: { type: 'string' } },
  },
} as const;

export interface DrafterOutput {
  title_en: string;
  title_ar: string;
  location_en: string;
  location_ar: string;
  sectors: string[];
  design_categories: string[];
  basis: { title: string; location: string; classification: string };
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

/** Merges the AI's output into the draft: suggestions never replace verified facts or human text. */
export function mergeOutput(draft: ProjectDraft, out: DrafterOutput, model: string, textProblems: string[]): void {
  const f = draft.facts;
  const set = (key: keyof DraftFacts, value: string | string[], basis: string) => {
    const empty = Array.isArray(value) ? !value.length : !value.trim();
    if (empty) return;
    const current = f[key] as Fact<unknown>;
    if (VERIFIED_SOURCES.includes(current.source)) return;
    // A folder-name value stays unless the AI offers a better-formed one for the same field.
    (f[key] as Fact<unknown>) = { value: Array.isArray(value) ? value : value.trim(), source: 'ai', basis: `AI suggestion: ${basis || 'no basis given'}` };
  };
  set('titleEn', out.title_en, out.basis.title);
  set('titleAr', out.title_ar, out.basis.title);
  set('locationEn', out.location_en, out.basis.location);
  set('locationAr', out.location_ar, out.basis.location);
  if (!f.sectors.value.length || f.sectors.source === 'ai') set('sectors', out.sectors, out.basis.classification);
  if (f.designCategories.source !== 'folder' || !f.designCategories.value.length) set('designCategories', out.design_categories, out.basis.classification);

  draft.visualNotes = out.visual_notes.map((n) => n.trim()).filter(Boolean).slice(0, 10);
  draft.ai = { model, at: new Date().toISOString() };

  if (textProblems.length) {
    draft.notes.push(`AI text discarded: ${textProblems.join('; ')}. Write it in the editor, or redraft.`);
    return;
  }
  const c = draft.content;
  const human = (k: keyof typeof c) => c[k].source === 'owner' || c[k].source === 'register';
  if (!human('summaryEn')) c.summaryEn = { value: out.summary_en.trim(), source: 'ai' };
  if (!human('summaryAr')) c.summaryAr = { value: out.summary_ar.trim(), source: 'ai' };
  if (!human('descriptionEn')) c.descriptionEn = { value: out.description_en.map((p) => p.trim()), source: 'ai' };
  if (!human('descriptionAr')) c.descriptionAr = { value: out.description_ar.map((p) => p.trim()), source: 'ai' };
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

    const known = Object.fromEntries(
      FACT_KEYS.map((k) => [k, { value: draft.facts[k].value, source: draft.facts[k].source }]).filter(([, v]) => {
        const val = (v as { value: string | string[] }).value;
        return Array.isArray(val) ? val.length : val;
      }),
    );
    const studioText = Object.fromEntries(
      (['summaryEn', 'summaryAr', 'descriptionEn', 'descriptionAr'] as const)
        .filter((k) => draft.content[k].source === 'owner' || draft.content[k].source === 'register')
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
        `Known facts (with sources): ${JSON.stringify(known)}`,
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
