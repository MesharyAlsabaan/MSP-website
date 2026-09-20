import { DataSource } from 'typeorm';
import { VendorCategory } from '../../modules/vendors/entities/vendor-category.entity';
import { VendorDocumentRequirement } from '../../modules/vendors/entities/vendor-document-requirement.entity';

/**
 * PROVISIONAL vendor categories and the documents each one asks for.
 * These are sample data for local testing — the final list and which
 * documents are mandatory are still to be confirmed by management, and both
 * are editable from the admin afterwards (they are rows, not code).
 *
 * `archiveFolder` is the sub-folder the office archive files the document
 * under (see the design spec §4/§10).
 */

interface DocSpec {
  key: string;
  ar: string;
  en: string;
  folder: string;
  expiry?: boolean;
}

const DOC: Record<string, DocSpec> = {
  cr: { key: 'commercial-registration', ar: 'السجل التجاري', en: 'Commercial registration', folder: 'السجل التجاري', expiry: true },
  vat: { key: 'vat-certificate', ar: 'شهادة الزكاة والضريبة', en: 'Zakat & VAT certificate', folder: 'الشهادات والتراخيص', expiry: true },
  profile: { key: 'company-profile', ar: 'بروفايل الشركة', en: 'Company profile', folder: 'بروفايل الشركة' },
  classification: { key: 'contractor-classification', ar: 'شهادة تصنيف المقاولين', en: 'Contractor classification certificate', folder: 'الشهادات والتراخيص', expiry: true },
  gosi: { key: 'gosi-certificate', ar: 'شهادة التأمينات الاجتماعية', en: 'GOSI certificate', folder: 'الشهادات والتراخيص', expiry: true },
  chamber: { key: 'chamber-of-commerce', ar: 'شهادة الغرفة التجارية', en: 'Chamber of Commerce certificate', folder: 'الشهادات والتراخيص', expiry: true },
  license: { key: 'professional-license', ar: 'الترخيص المهني', en: 'Professional license', folder: 'الشهادات والتراخيص', expiry: true },
  iso: { key: 'quality-certificates', ar: 'شهادات الجودة (ISO)', en: 'Quality certificates (ISO)', folder: 'الشهادات والتراخيص' },
  catalogue: { key: 'product-catalogue', ar: 'كتالوج المنتجات', en: 'Product catalogue', folder: 'مستندات أخرى' },
  other: { key: 'other', ar: 'مستندات أخرى', en: 'Other documents', folder: 'مستندات أخرى' },
};

interface CategorySpec {
  key: string;
  ar: string;
  en: string;
  required: DocSpec[];
  optional: DocSpec[];
}

export const VENDOR_CATEGORIES: CategorySpec[] = [
  { key: 'general-contractor', ar: 'مقاولون عامون', en: 'General contractors', required: [DOC.cr, DOC.vat, DOC.classification, DOC.profile], optional: [DOC.gosi, DOC.chamber, DOC.iso, DOC.other] },
  { key: 'mep-subcontractor', ar: 'مقاولو باطن (كهرباء / ميكانيكا / سباكة)', en: 'MEP subcontractors', required: [DOC.cr, DOC.vat, DOC.profile], optional: [DOC.classification, DOC.gosi, DOC.license, DOC.other] },
  { key: 'building-materials', ar: 'موردو مواد البناء', en: 'Building-material suppliers', required: [DOC.cr, DOC.vat, DOC.profile], optional: [DOC.catalogue, DOC.iso, DOC.other] },
  { key: 'finishes-stone', ar: 'تشطيبات وأحجار', en: 'Finishes & stone', required: [DOC.cr, DOC.vat, DOC.profile], optional: [DOC.catalogue, DOC.iso, DOC.other] },
  { key: 'furniture-ffe', ar: 'أثاث وتجهيزات', en: 'Furniture & FF&E', required: [DOC.cr, DOC.vat, DOC.profile], optional: [DOC.catalogue, DOC.other] },
  { key: 'consultancy', ar: 'مكاتب استشارية', en: 'Consultancy offices', required: [DOC.cr, DOC.vat, DOC.license, DOC.profile], optional: [DOC.iso, DOC.other] },
  { key: 'survey-geotech', ar: 'مساحة وفحص تربة', en: 'Survey & geotechnical', required: [DOC.cr, DOC.vat, DOC.license, DOC.profile], optional: [DOC.iso, DOC.other] },
  { key: 'other', ar: 'أخرى', en: 'Other', required: [DOC.cr, DOC.vat, DOC.profile], optional: [DOC.other] },
];

/** Upserts categories and their requirements; safe to run repeatedly. */
export async function seedVendorCategories(ds: DataSource): Promise<void> {
  const categories = ds.getRepository(VendorCategory);
  const requirements = ds.getRepository(VendorDocumentRequirement);

  for (const [i, c] of VENDOR_CATEGORIES.entries()) {
    await categories.save({ key: c.key, nameAr: c.ar, nameEn: c.en, active: true, sortOrder: i });
    const docs = [
      ...c.required.map((d) => ({ ...d, required: true })),
      ...c.optional.map((d) => ({ ...d, required: false })),
    ];
    for (const [j, d] of docs.entries()) {
      const existing = await requirements.findOne({ where: { categoryKey: c.key, docTypeKey: d.key } });
      await requirements.save({
        ...(existing ?? {}),
        categoryKey: c.key,
        docTypeKey: d.key,
        nameAr: d.ar,
        nameEn: d.en,
        required: d.required,
        requiresExpiry: !!d.expiry,
        archiveFolder: d.folder,
        sortOrder: j,
      });
    }
  }
}
