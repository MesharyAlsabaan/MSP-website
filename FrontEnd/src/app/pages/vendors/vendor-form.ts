import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Button } from '../../shared/ui/button/button';
import { TranslationService } from '../../core/services/translation.service';
import { ChosenDocument, ResumeContext, VendorCategory, VendorProfile } from '../../core/services/vendors.service';

interface L { en: string; ar: string; }

const MAX_FILE_MB = 15;
const MAX_TOTAL_MB = 80;
const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx';

/**
 * The vendor profile + documents form, shared by first registration and the
 * completion (resubmit) page. Emits the profile and the files the user chose;
 * the parent decides which endpoint to call. Client-side checks mirror the
 * server's: allowed types, 15 MB per file, 80 MB per submission, required
 * documents and expiry dates for the chosen category.
 */
@Component({
  selector: 'app-vendor-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Button],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-10">
      <!-- honeypot: humans never see it -->
      <div class="absolute -left-[9999px] top-0" aria-hidden="true">
        <label>Company website <input type="text" name="company_website" tabindex="-1" autocomplete="off" formControlName="company_website" /></label>
      </div>

      <fieldset class="space-y-6">
        <legend [class]="legendClass">{{ i18n.pick(t.company) }}</legend>
        <div class="grid gap-6 sm:grid-cols-2">
          <div>
            <label [class]="labelClass" for="v-companyName">{{ i18n.pick(t.companyName) }} *</label>
            <input id="v-companyName" formControlName="companyName" [class]="fieldClass" />
            @if (err('companyName')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-companyNameEn">{{ i18n.pick(t.companyNameEn) }}</label>
            <input id="v-companyNameEn" formControlName="companyNameEn" [class]="fieldClass" dir="ltr" />
          </div>
          <div>
            <label [class]="labelClass" for="v-cr">{{ i18n.pick(t.cr) }} *</label>
            <input id="v-cr" formControlName="commercialRegistrationNo" [class]="fieldClass" dir="ltr" inputmode="numeric" />
            @if (err('commercialRegistrationNo')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-vat">{{ i18n.pick(t.vat) }}</label>
            <input id="v-vat" formControlName="vatNo" [class]="fieldClass" dir="ltr" inputmode="numeric" />
          </div>
          <div>
            <label [class]="labelClass" for="v-city">{{ i18n.pick(t.city) }} *</label>
            <input id="v-city" formControlName="city" [class]="fieldClass" />
            @if (err('city')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-website">{{ i18n.pick(t.website) }}</label>
            <input id="v-website" formControlName="website" [class]="fieldClass" dir="ltr" placeholder="https://" />
          </div>
          <div class="sm:col-span-2">
            <label [class]="labelClass" for="v-address">{{ i18n.pick(t.address) }}</label>
            <input id="v-address" formControlName="address" [class]="fieldClass" />
          </div>
          <div class="sm:col-span-2">
            <label [class]="labelClass" for="v-specialty">{{ i18n.pick(t.specialty) }}</label>
            <input id="v-specialty" formControlName="specialty" [class]="fieldClass" [placeholder]="i18n.pick(t.specialtyPh)" />
          </div>
        </div>
      </fieldset>

      <fieldset class="space-y-6">
        <legend [class]="legendClass">{{ i18n.pick(t.contact) }}</legend>
        <div class="grid gap-6 sm:grid-cols-2">
          <div>
            <label [class]="labelClass" for="v-contactName">{{ i18n.pick(t.contactName) }} *</label>
            <input id="v-contactName" formControlName="contactName" [class]="fieldClass" />
            @if (err('contactName')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-email">{{ i18n.pick(t.email) }} *</label>
            <input id="v-email" type="email" formControlName="email" [class]="fieldClass" dir="ltr" />
            @if (err('email')) { <p [class]="errClass">{{ i18n.pick(t.invalidEmail) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-mobile">{{ i18n.pick(t.mobile) }} *</label>
            <input id="v-mobile" formControlName="mobile" [class]="fieldClass" dir="ltr" inputmode="tel" placeholder="05xxxxxxxx" />
            @if (err('mobile')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
          </div>
          <div>
            <label [class]="labelClass" for="v-phone">{{ i18n.pick(t.phone) }}</label>
            <input id="v-phone" formControlName="phone" [class]="fieldClass" dir="ltr" inputmode="tel" />
          </div>
        </div>
      </fieldset>

      <fieldset class="space-y-6">
        <legend [class]="legendClass">{{ i18n.pick(t.classification) }}</legend>
        <div>
          <label [class]="labelClass" for="v-category">{{ i18n.pick(t.primaryCategory) }} *</label>
          <select id="v-category" formControlName="primaryCategoryKey" [class]="fieldClass">
            <option value="">{{ i18n.pick(t.choose) }}</option>
            @for (c of categories(); track c.key) {
              <option [value]="c.key">{{ i18n.isArabic() ? c.nameAr : c.nameEn }}</option>
            }
          </select>
          @if (err('primaryCategoryKey')) { <p [class]="errClass">{{ i18n.pick(t.required) }}</p> }
        </div>
        <div>
          <p [class]="labelClass">{{ i18n.pick(t.secondaryCategories) }}</p>
          <div class="flex flex-wrap gap-x-6 gap-y-3">
            @for (c of categories(); track c.key) {
              @if (c.key !== form.controls.primaryCategoryKey.value) {
                <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-ink">
                  <input type="checkbox" [checked]="secondary().has(c.key)" (change)="toggleSecondary(c.key)" class="accent-accent" />
                  {{ i18n.isArabic() ? c.nameAr : c.nameEn }}
                </label>
              }
            }
          </div>
        </div>
      </fieldset>

      @if (currentCategory(); as cat) {
        <fieldset class="space-y-6">
          <legend [class]="legendClass">{{ i18n.pick(t.documents) }}</legend>
          <p class="text-sm text-muted">{{ i18n.pick(t.documentsHint) }}</p>
          <ul class="divide-y divide-hairline border-y border-hairline">
            @for (r of cat.requirements; track r.docTypeKey) {
              <li class="grid gap-3 py-4 sm:grid-cols-12 sm:items-center">
                <div class="sm:col-span-4">
                  <span class="text-ink">{{ i18n.isArabic() ? r.nameAr : r.nameEn }}</span>
                  @if (r.required) { <span class="ms-1 text-accent">*</span> }
                  @if (existingFor(r.docTypeKey); as ex) {
                    <p class="mt-1 font-mono text-xs text-muted">{{ i18n.pick(t.onFile) }}: {{ ex.originalFilename }}</p>
                  }
                </div>
                <div class="sm:col-span-5">
                  <input type="file" [accept]="accept" (change)="onFile(r.docTypeKey, $event)" class="block w-full text-sm text-muted file:me-3 file:border file:border-ink/30 file:bg-transparent file:px-3 file:py-1.5 file:font-mono file:text-xs file:uppercase file:tracking-[0.12em] file:text-ink" />
                  @if (files().get(r.docTypeKey); as f) {
                    <p class="mt-1 font-mono text-xs text-muted" dir="ltr">{{ f.name }} · {{ (f.size / 1048576).toFixed(1) }} MB</p>
                  }
                </div>
                <div class="sm:col-span-3">
                  @if (r.requiresExpiry) {
                    <label class="sr-only" [for]="'exp-' + r.docTypeKey">{{ i18n.pick(t.expiry) }}</label>
                    <input [id]="'exp-' + r.docTypeKey" type="date" [value]="expiries().get(r.docTypeKey) ?? ''" (change)="onExpiry(r.docTypeKey, $event)" [class]="fieldClass" [title]="i18n.pick(t.expiry)" />
                    <p class="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{{ i18n.pick(t.expiry) }}</p>
                  }
                </div>
              </li>
            }
          </ul>
        </fieldset>
      }

      <div>
        <label [class]="labelClass" for="v-notes">{{ i18n.pick(t.notes) }}</label>
        <textarea id="v-notes" formControlName="notes" rows="3" [class]="fieldClass"></textarea>
      </div>

      @if (problem(); as p) {
        <p [class]="errClass" role="alert">{{ p }}</p>
      }

      <app-button type="submit" [disabled]="busy()">
        {{ busy() ? i18n.pick(t.sending) : i18n.pick(submitLabel()) }}
      </app-button>
    </form>
  `,
})
export class VendorForm {
  protected readonly i18n = inject(TranslationService);
  private readonly fb = new FormBuilder();

  readonly categories = input.required<VendorCategory[]>();
  /** Existing application when completing (prefills fields and shows documents on file). */
  readonly resume = input<ResumeContext | null>(null);
  readonly busy = input(false);
  readonly serverError = input<string | null>(null);
  readonly submitted = output<{ profile: VendorProfile; documents: ChosenDocument[] }>();

  protected readonly accept = ACCEPT;
  protected readonly labelClass = 'mb-2 block font-mono text-xs uppercase tracking-[0.12em] text-muted';
  protected readonly legendClass = 'mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent';
  protected readonly fieldClass = 'w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-base text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none';
  protected readonly errClass = 'mt-2 font-mono text-xs uppercase tracking-[0.1em] text-accent';

  protected readonly form = this.fb.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(200)]],
    companyNameEn: [''],
    specialty: [''],
    contactName: ['', Validators.required],
    phone: [''],
    mobile: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    city: ['', Validators.required],
    address: [''],
    commercialRegistrationNo: ['', Validators.required],
    vatNo: [''],
    website: [''],
    primaryCategoryKey: ['', Validators.required],
    notes: [''],
    company_website: [''],
  });

  protected readonly secondary = signal(new Set<string>());
  protected readonly files = signal(new Map<string, File>());
  protected readonly expiries = signal(new Map<string, string>());
  protected readonly localError = signal<string | null>(null);
  private readonly primaryKey = signal('');

  protected readonly currentCategory = computed(() => this.categories().find((c) => c.key === this.primaryKey()) ?? null);
  protected readonly problem = computed(() => this.localError() ?? this.serverError());
  protected readonly submitLabel = computed<L>(() => (this.resume() ? this.t.resubmit : this.t.submit));

  protected readonly t = {
    company: { en: 'Company', ar: 'بيانات الشركة' },
    companyName: { en: 'Company name', ar: 'اسم الشركة' },
    companyNameEn: { en: 'Company name (English)', ar: 'اسم الشركة بالإنجليزية' },
    cr: { en: 'Commercial registration no.', ar: 'رقم السجل التجاري' },
    vat: { en: 'VAT number', ar: 'الرقم الضريبي' },
    city: { en: 'City', ar: 'المدينة' },
    website: { en: 'Website', ar: 'الموقع الإلكتروني' },
    address: { en: 'Address', ar: 'العنوان' },
    specialty: { en: 'Specialty', ar: 'التخصص' },
    specialtyPh: { en: 'e.g. residential & commercial buildings', ar: 'مثال: مبانٍ سكنية وتجارية' },
    contact: { en: 'Contact person', ar: 'مسؤول التواصل' },
    contactName: { en: 'Name', ar: 'الاسم' },
    email: { en: 'Email', ar: 'البريد الإلكتروني' },
    mobile: { en: 'Mobile', ar: 'الجوال' },
    phone: { en: 'Phone', ar: 'الهاتف' },
    classification: { en: 'Classification', ar: 'التصنيف' },
    primaryCategory: { en: 'Primary category', ar: 'التصنيف الأساسي' },
    secondaryCategories: { en: 'Also active in', ar: 'تصنيفات ثانوية (اختياري)' },
    choose: { en: 'Choose…', ar: 'اختر…' },
    documents: { en: 'Documents', ar: 'المستندات المطلوبة' },
    documentsHint: { en: `PDF, JPG, PNG, DOCX or XLSX · up to ${MAX_FILE_MB} MB per file, ${MAX_TOTAL_MB} MB in total. Items marked * are required.`, ar: `PDF أو JPG أو PNG أو DOCX أو XLSX · حتى ${MAX_FILE_MB} م.ب للملف و${MAX_TOTAL_MB} م.ب إجمالاً. البنود المعلّمة بـ * إلزامية.` },
    onFile: { en: 'On file', ar: 'المرفق الحالي' },
    expiry: { en: 'Expiry date', ar: 'تاريخ الانتهاء' },
    notes: { en: 'Notes', ar: 'ملاحظات' },
    required: { en: 'Required', ar: 'هذا الحقل مطلوب' },
    invalidEmail: { en: 'Enter a valid email', ar: 'أدخل بريداً صحيحاً' },
    submit: { en: 'Submit application', ar: 'إرسال الطلب' },
    resubmit: { en: 'Resubmit application', ar: 'إعادة إرسال الطلب' },
    sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
    tooBig: { en: `"{name}" is larger than ${MAX_FILE_MB} MB`, ar: `الملف "{name}" أكبر من ${MAX_FILE_MB} م.ب` },
    badType: { en: `"{name}" is not an accepted file type`, ar: `نوع الملف "{name}" غير مقبول` },
    tooBigTotal: { en: `Documents exceed ${MAX_TOTAL_MB} MB in total`, ar: `مجموع المستندات يتجاوز ${MAX_TOTAL_MB} م.ب` },
    missingDoc: { en: 'Missing required document: {name}', ar: 'مستند إلزامي ناقص: {name}' },
    missingExpiry: { en: 'Expiry date required for: {name}', ar: 'تاريخ الانتهاء مطلوب لـ: {name}' },
    fixFields: { en: 'Please complete the highlighted fields', ar: 'يرجى إكمال الحقول المعلّمة' },
  };

  constructor() {
    this.form.controls.primaryCategoryKey.valueChanges.subscribe((k) => {
      this.primaryKey.set(k);
      this.secondary.update((s) => { const n = new Set(s); n.delete(k); return n; });
    });
    effect(() => {
      const r = this.resume();
      if (!r) return;
      const { secondaryCategoryKeys, expiries, ...rest } = r.data;
      this.form.patchValue({ ...rest, primaryCategoryKey: r.data.primaryCategoryKey });
      this.primaryKey.set(r.data.primaryCategoryKey);
      this.secondary.set(new Set(secondaryCategoryKeys ?? []));
      const ex = new Map<string, string>();
      for (const d of r.documents) if (d.expiresAt) ex.set(d.docTypeKey, d.expiresAt);
      for (const [k, v] of Object.entries(expiries ?? {})) ex.set(k, v);
      this.expiries.set(ex);
    });
  }

  protected err(c: keyof typeof this.form.controls): boolean {
    const ctrl = this.form.controls[c];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  protected existingFor(docTypeKey: string) {
    return this.resume()?.documents.find((d) => d.docTypeKey === docTypeKey) ?? null;
  }

  protected toggleSecondary(key: string): void {
    this.secondary.update((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }

  protected onFile(docTypeKey: string, ev: Event): void {
    const file = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.localError.set(null);
    this.files.update((m) => { const n = new Map(m); file ? n.set(docTypeKey, file) : n.delete(docTypeKey); return n; });
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.split(',').includes(ext)) this.localError.set(this.fmt(this.t.badType, file.name));
    else if (file.size > MAX_FILE_MB * 1048576) this.localError.set(this.fmt(this.t.tooBig, file.name));
  }

  protected onExpiry(docTypeKey: string, ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.expiries.update((m) => { const n = new Map(m); v ? n.set(docTypeKey, v) : n.delete(docTypeKey); return n; });
  }

  protected onSubmit(): void {
    this.localError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.localError.set(this.i18n.pick(this.t.fixFields));
      return;
    }
    const cat = this.currentCategory();
    if (!cat) return;
    let total = 0;
    for (const f of this.files().values()) total += f.size;
    if (total > MAX_TOTAL_MB * 1048576) return this.localError.set(this.i18n.pick(this.t.tooBigTotal));
    for (const r of cat.requirements) {
      const name = this.i18n.isArabic() ? r.nameAr : r.nameEn;
      const has = this.files().has(r.docTypeKey) || !!this.existingFor(r.docTypeKey);
      if (r.required && !has) return this.localError.set(this.fmt(this.t.missingDoc, name));
      if (r.requiresExpiry && has && !this.expiries().get(r.docTypeKey)) return this.localError.set(this.fmt(this.t.missingExpiry, name));
    }
    const v = this.form.getRawValue();
    const profile: VendorProfile = {
      companyName: v.companyName, companyNameEn: v.companyNameEn, specialty: v.specialty, contactName: v.contactName,
      phone: v.phone, mobile: v.mobile, email: v.email, city: v.city, address: v.address,
      commercialRegistrationNo: v.commercialRegistrationNo, vatNo: v.vatNo, website: v.website,
      primaryCategoryKey: v.primaryCategoryKey, secondaryCategoryKeys: [...this.secondary()], notes: v.notes,
      expiries: Object.fromEntries(this.expiries()),
    };
    const documents: ChosenDocument[] = [...this.files().entries()].map(([docTypeKey, file]) => ({ docTypeKey, file }));
    this.submitted.emit({ profile, documents });
  }

  private fmt(l: L, name: string): string {
    return this.i18n.pick(l).replace('{name}', name);
  }
}
