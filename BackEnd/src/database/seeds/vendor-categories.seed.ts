import { DataSource } from 'typeorm';
import { VendorCategory } from '../../modules/vendors/entities/vendor-category.entity';
import { VendorDocumentRequirement } from '../../modules/vendors/entities/vendor-document-requirement.entity';

/**
 * Vendor categories for an architecture & engineering consultancy, and the
 * documents each one asks for. Every category REQUIRES the commercial
 * registration and the Zakat/VAT certificate (both with expiry dates) plus a
 * company profile; specialised licences are added per category.
 *
 * These are rows, not code: the list is editable from the admin API
 * afterwards. Re-running the seed upserts by key; retired categories are
 * deactivated (kept for existing applications), never deleted.
 */

interface DocSpec { key: string; ar: string; en: string; folder: string; expiry?: boolean; }

const DOC = {
  cr: { key: 'commercial-registration', ar: 'السجل التجاري', en: 'Commercial registration', folder: 'السجل التجاري', expiry: true },
  vat: { key: 'vat-certificate', ar: 'شهادة الزكاة والضريبة (التسجيل الضريبي)', en: 'Zakat & VAT registration certificate', folder: 'الشهادات والتراخيص', expiry: true },
  profile: { key: 'company-profile', ar: 'بروفايل الشركة', en: 'Company profile', folder: 'بروفايل الشركة' },
  classification: { key: 'contractor-classification', ar: 'شهادة تصنيف المقاولين', en: 'Contractor classification certificate', folder: 'الشهادات والتراخيص', expiry: true },
  sce: { key: 'sce-license', ar: 'ترخيص الهيئة السعودية للمهندسين', en: 'Saudi Council of Engineers licence', folder: 'الشهادات والتراخيص', expiry: true },
  gosi: { key: 'gosi-certificate', ar: 'شهادة التأمينات الاجتماعية', en: 'GOSI certificate', folder: 'الشهادات والتراخيص', expiry: true },
  chamber: { key: 'chamber-of-commerce', ar: 'شهادة الغرفة التجارية', en: 'Chamber of Commerce certificate', folder: 'الشهادات والتراخيص', expiry: true },
  municipal: { key: 'municipal-license', ar: 'رخصة البلدية', en: 'Municipal licence', folder: 'الشهادات والتراخيص', expiry: true },
  civilDefense: { key: 'civil-defense-license', ar: 'ترخيص الدفاع المدني', en: 'Civil Defense licence', folder: 'الشهادات والتراخيص', expiry: true },
  iso: { key: 'quality-certificates', ar: 'شهادات الجودة (ISO)', en: 'Quality certificates (ISO)', folder: 'الشهادات والتراخيص' },
  catalogue: { key: 'product-catalogue', ar: 'كتالوج المنتجات', en: 'Product catalogue', folder: 'مستندات أخرى' },
  portfolio: { key: 'portfolio', ar: 'سابقة الأعمال (Portfolio)', en: 'Portfolio of previous work', folder: 'مستندات أخرى' },
  agency: { key: 'agency-certificate', ar: 'شهادة الوكالة / التوزيع', en: 'Agency / distribution certificate', folder: 'الشهادات والتراخيص', expiry: true },
  saso: { key: 'saso-certificate', ar: 'شهادة مطابقة (SASO / SABER)', en: 'SASO / SABER conformity certificate', folder: 'الشهادات والتراخيص', expiry: true },
  other: { key: 'other', ar: 'مستندات أخرى', en: 'Other documents', folder: 'مستندات أخرى' },
} satisfies Record<string, DocSpec>;

interface CategorySpec { key: string; ar: string; en: string; required: DocSpec[]; optional: DocSpec[]; }

const BASE = [DOC.cr, DOC.vat, DOC.profile];
const contractor = (key: string, ar: string, en: string, extra: DocSpec[] = []): CategorySpec => ({ key, ar, en, required: BASE, optional: [DOC.classification, DOC.gosi, DOC.chamber, DOC.iso, DOC.portfolio, ...extra, DOC.other] });
const supplier = (key: string, ar: string, en: string, extra: DocSpec[] = []): CategorySpec => ({ key, ar, en, required: BASE, optional: [DOC.catalogue, DOC.agency, DOC.saso, DOC.iso, ...extra, DOC.other] });
const consultant = (key: string, ar: string, en: string, extra: DocSpec[] = []): CategorySpec => ({ key, ar, en, required: [...BASE, DOC.sce], optional: [DOC.portfolio, DOC.iso, ...extra, DOC.other] });
const studio = (key: string, ar: string, en: string): CategorySpec => ({ key, ar, en, required: BASE, optional: [DOC.portfolio, DOC.sce, DOC.other] });

export const VENDOR_CATEGORIES: CategorySpec[] = [
  // ---- استشارات وخدمات هندسية
  consultant('engineering-consultancy', 'استشارات هندسية', 'Engineering consultancy'),
  consultant('survey-geotech', 'مساحة وفحص تربة', 'Survey & geotechnical (soil testing)'),
  consultant('bim-services', 'خدمات BIM ونمذجة', 'BIM & modelling services'),
  studio('architectural-visualization', 'إظهار معماري (Rendering / Visualization)', 'Architectural visualization'),
  studio('architectural-models', 'مجسمات معمارية', 'Architectural scale models'),
  studio('interior-design', 'تصميم داخلي', 'Interior design studios'),
  studio('landscape-design', 'تصميم مواقع وتنسيق حدائق', 'Landscape design'),
  // ---- مقاولون
  { ...contractor('general-contractor', 'مقاولون عامون', 'General contractors'), required: [...BASE, DOC.classification] },
  contractor('mep-subcontractor', 'مقاولو باطن (كهرباء / ميكانيكا / سباكة)', 'MEP subcontractors'),
  contractor('hvac', 'تكييف وتهوية', 'HVAC'),
  contractor('elevators', 'مصاعد وسلالم متحركة', 'Elevators & escalators', [DOC.agency]),
  contractor('electrical', 'كهرباء وإنارة', 'Electrical & lighting'),
  contractor('plumbing-firefighting', 'سباكة وإطفاء حريق', 'Plumbing & fire fighting', [DOC.civilDefense]),
  contractor('steel-structures', 'هياكل معدنية', 'Steel structures'),
  contractor('waterproofing-insulation', 'عزل مائي وحراري', 'Waterproofing & insulation'),
  contractor('aluminum-glass', 'ألمنيوم وزجاج وواجهات', 'Aluminium, glass & façades'),
  contractor('finishes-stone', 'تشطيبات وأحجار ورخام', 'Finishes, stone & marble'),
  contractor('landscape-contractor', 'تنفيذ مواقع وزراعة', 'Landscape contractors'),
  contractor('swimming-pools', 'مسابح ومعالجة مياه', 'Swimming pools & water treatment'),
  contractor('smart-systems', 'أنظمة ذكية وأمن وشبكات', 'Smart systems, security & networks'),
  contractor('solar-energy', 'طاقة شمسية', 'Solar energy'),
  // ---- موردون
  supplier('building-materials', 'موردو مواد البناء', 'Building-material suppliers'),
  supplier('doors-windows', 'أبواب ونوافذ', 'Doors & windows'),
  supplier('sanitary-ware', 'أدوات صحية وسيراميك', 'Sanitary ware & ceramics'),
  supplier('furniture-ffe', 'أثاث وتجهيزات', 'Furniture & FF&E'),
  supplier('lighting-fixtures', 'وحدات إنارة', 'Lighting fixtures'),
  supplier('kitchens-wardrobes', 'مطابخ وخزائن', 'Kitchens & wardrobes'),
  supplier('signage', 'لوحات وتصاميم إعلانية', 'Signage'),
  supplier('printing-services', 'طباعة مخططات وخدمات مكتبية', 'Printing & office services'),
  { key: 'other', ar: 'أخرى', en: 'Other', required: BASE, optional: [DOC.other] },
];

/** Keys from earlier seeds that no longer exist: categories are deactivated (never deleted), requirement rows removed. */
const RETIRED_CATEGORIES = ['consultancy'];
const RETIRED_DOC_TYPES = ['professional-license'];

/** Upserts categories and their requirements; safe to run repeatedly. Never deletes a category. */
export async function seedVendorCategories(ds: DataSource): Promise<void> {
  const categories = ds.getRepository(VendorCategory);
  const requirements = ds.getRepository(VendorDocumentRequirement);
  for (const key of RETIRED_CATEGORIES) await categories.update({ key }, { active: false });
  for (const docTypeKey of RETIRED_DOC_TYPES) await requirements.delete({ docTypeKey });
  for (const [i, c] of VENDOR_CATEGORIES.entries()) {
    await categories.save({ key: c.key, nameAr: c.ar, nameEn: c.en, active: true, sortOrder: i });
    // one row per doc type; 'required' wins if a type appears in both lists
    const byKey = new Map<string, DocSpec & { required: boolean }>();
    for (const d of c.optional) byKey.set(d.key, { ...d, required: false });
    for (const d of c.required) byKey.set(d.key, { ...d, required: true });
    const docs = [...c.required.map((d) => byKey.get(d.key)!), ...c.optional.filter((d) => !c.required.some((r) => r.key === d.key)).map((d) => byKey.get(d.key)!)];
    for (const [j, d] of docs.entries()) {
      const existing = await requirements.findOne({ where: { categoryKey: c.key, docTypeKey: d.key } });
      await requirements.save({ ...(existing ?? {}), categoryKey: c.key, docTypeKey: d.key, nameAr: d.ar, nameEn: d.en, required: d.required, requiresExpiry: !!d.expiry, archiveFolder: d.folder, sortOrder: j });
    }
  }
}
