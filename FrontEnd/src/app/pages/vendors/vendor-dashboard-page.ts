import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { Button } from '../../shared/ui/button/button';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { VendorSession } from '../../core/services/vendor-session.service';
import { DocumentView, MyApplication, VendorCategory, VendorProfile, VendorsService, vendorErrorMessage } from '../../core/services/vendors.service';
import { ERR, FIELD, LABEL } from './vendor-auth-pages';
import { PINNED_COUNTRIES, countryOptions } from '../../core/data/countries';

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.docx,.xlsx';
const MAX_FILE_MB = 15;

const STATUS: Record<string, { en: string; ar: string; cls: string }> = {
  draft: { en: 'Draft — not submitted yet', ar: 'مسودة — لم تُرسل بعد', cls: 'text-muted' },
  under_review: { en: 'Under review', ar: 'قيد المراجعة', cls: 'text-amber-700' },
  needs_completion: { en: 'Action needed — please update and resubmit', ar: 'مطلوب استكمال — حدّث الطلب وأعد إرساله', cls: 'text-accent' },
  approved: { en: 'Approved — you are a qualified vendor', ar: 'معتمد — أنت مورد مؤهل لدى MSP', cls: 'text-emerald-700' },
  rejected: { en: 'Not accepted', ar: 'لم يُقبل الطلب', cls: 'text-red-600' },
};
const ACTION: Record<string, { en: string; ar: string }> = {
  submitted: { en: 'Submitted', ar: 'تم الإرسال' }, resubmitted: { en: 'Resubmitted', ar: 'أُعيد الإرسال' },
  completion_requested: { en: 'Completion requested', ar: 'طلب استكمال' }, update_requested: { en: 'Update requested', ar: 'طلب تحديث' },
  approved: { en: 'Approved', ar: 'اعتماد' }, rejected: { en: 'Rejected', ar: 'رفض' }, archive_retried: { en: 'Archive retried', ar: 'إعادة أرشفة' },
};

/**
 * The vendor's dashboard: status and reviewer notes at the top; the editable
 * draft (saved to the office service on demand, documents uploaded one at a
 * time) when there is one; the submitted revision and the history otherwise.
 * Nothing is kept in the browser: every save round-trips to the office, and
 * a failure is shown as such — never as success.
 */
@Component({
  selector: 'app-vendor-dashboard-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, DatePipe, Container, Button],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-10 sm:pt-20">
      <app-container>
        <div class="flex flex-wrap items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
          <span>{{ session.account()?.email }}</span>
          <button (click)="signOut()" class="text-ink hover:text-accent">{{ i18n.pick(t.signOut) }}</button>
        </div>
        @if (app(); as a) {
          <h1 class="mt-8 t-display font-display font-medium tracking-[-0.035em] text-ink">{{ a.vendor.companyName || i18n.pick(t.untitled) }}</h1>
          <p class="mt-4 font-mono text-sm text-muted" dir="ltr">{{ a.vendor.vendorNumber }}@if (a.application.requestNumber) { · {{ a.application.requestNumber }} · v{{ a.application.currentRevisionNo }} }</p>
          <p class="mt-4 font-mono text-xs uppercase tracking-[0.15em]" [class]="status(a).cls">{{ i18n.pick(status(a)) }}</p>
        } @else if (loadError(); as e) {
          <p class="mt-8 text-lg text-accent">{{ e }}</p>
          <button (click)="load()" class="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent">{{ i18n.pick(t.retry) }}</button>
        } @else {
          <p class="mt-8 text-muted">{{ i18n.pick(t.loading) }}</p>
        }
      </app-container>
    </section>

    @if (app(); as a) {
      <section class="py-12 sm:py-16">
        <app-container>
          <div class="mx-auto max-w-3xl space-y-12">
            @if (a.review; as r) {
              <div class="border p-6" [class]="r.action === 'approved' ? 'border-emerald-600/40 bg-emerald-50/40' : r.action === 'rejected' ? 'border-red-500/40 bg-red-50/40' : 'border-accent/40 bg-accent/5'">
                <p class="font-mono text-xs uppercase tracking-[0.15em] text-muted">{{ i18n.pick(t.fromTeam) }} · {{ r.at | date: 'mediumDate' }}</p>
                <p class="mt-2 font-medium text-ink">{{ i18n.pick(action(r.action)) }}</p>
                @if (r.missingItems.length) { <ul class="mt-3 list-disc space-y-1 ps-6 text-ink">@for (m of r.missingItems; track m) { <li>{{ m }}</li> }</ul> }
                @if (r.note) { <p class="mt-3 text-muted">{{ r.note }}</p> }
              </div>
            }

            @if (a.draft; as d) {
              <form [formGroup]="form" (ngSubmit)="save()" novalidate class="space-y-10">
                <fieldset class="space-y-6">
                  <legend class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.company) }}</legend>
                  <div class="grid gap-6 sm:grid-cols-2">
                    <div><label [class]="L" for="companyName">{{ i18n.pick(t.companyName) }} *</label><input id="companyName" formControlName="companyName" [class]="F" /></div>
                    <div><label [class]="L" for="companyNameEn">{{ i18n.pick(t.companyNameEn) }}</label><input id="companyNameEn" formControlName="companyNameEn" [class]="F" dir="ltr" /></div>
                    <div><label [class]="L" for="cr">{{ i18n.pick(t.cr) }} *</label><input id="cr" formControlName="commercialRegistrationNo" [class]="F" dir="ltr" /></div>
                    <div><label [class]="L" for="vat">{{ i18n.pick(t.vat) }}</label><input id="vat" formControlName="vatNo" [class]="F" dir="ltr" /></div>
                    <div>
                      <label [class]="L" for="country">{{ i18n.pick(t.country) }} *</label>
                      <select id="country" formControlName="country" [class]="F">
                        <option value="">{{ i18n.pick(t.choose) }}</option>
                        @for (c of countries(); track c.code) {
                          <option [value]="c.code">{{ c.name }}</option>
                          @if (c.code === lastPinned) { <option disabled>──────────</option> }
                        }
                      </select>
                    </div>
                    <div><label [class]="L" for="city">{{ i18n.pick(t.city) }} *</label><input id="city" formControlName="city" [class]="F" /></div>
                    <div class="sm:col-span-2"><label [class]="L" for="address">{{ i18n.pick(t.address) }}</label><input id="address" formControlName="address" [class]="F" /></div>
                    <div><label [class]="L" for="website">{{ i18n.pick(t.website) }}</label><input id="website" formControlName="website" [class]="F" dir="ltr" placeholder="https://" /></div>
                    <div><label [class]="L" for="specialty">{{ i18n.pick(t.specialty) }}</label><input id="specialty" formControlName="specialty" [class]="F" /></div>
                  </div>
                </fieldset>
                <fieldset class="space-y-6">
                  <legend class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.contact) }}</legend>
                  <div class="grid gap-6 sm:grid-cols-2">
                    <div><label [class]="L" for="contactName">{{ i18n.pick(t.contactName) }} *</label><input id="contactName" formControlName="contactName" [class]="F" /></div>
                    <div><label [class]="L" for="email">{{ i18n.pick(t.email) }} *</label><input id="email" type="email" formControlName="email" [class]="F" dir="ltr" /></div>
                    <div><label [class]="L" for="mobile">{{ i18n.pick(t.mobile) }} *</label><input id="mobile" formControlName="mobile" [class]="F" dir="ltr" /></div>
                    <div><label [class]="L" for="phone">{{ i18n.pick(t.phone) }}</label><input id="phone" formControlName="phone" [class]="F" dir="ltr" /></div>
                  </div>
                </fieldset>
                <fieldset class="space-y-6">
                  <legend class="mb-2 font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.classification) }}</legend>
                  <div>
                    <label [class]="L" for="primaryCategoryKey">{{ i18n.pick(t.primary) }} *</label>
                    <select id="primaryCategoryKey" formControlName="primaryCategoryKey" [class]="F">
                      <option value="">{{ i18n.pick(t.choose) }}</option>
                      @for (c of categories(); track c.key) { <option [value]="c.key">{{ i18n.isArabic() ? c.nameAr : c.nameEn }}</option> }
                    </select>
                  </div>
                  <div>
                    <p [class]="L">{{ i18n.pick(t.secondary) }}</p>
                    <div class="flex flex-wrap gap-x-6 gap-y-3">
                      @for (c of categories(); track c.key) {
                        @if (c.key !== form.controls.primaryCategoryKey.value) {
                          <label class="inline-flex cursor-pointer items-center gap-2 text-sm text-ink"><input type="checkbox" [checked]="secondary().has(c.key)" (change)="toggleSecondary(c.key)" class="accent-accent" />{{ i18n.isArabic() ? c.nameAr : c.nameEn }}</label>
                        }
                      }
                    </div>
                  </div>
                </fieldset>
                <div><label [class]="L" for="notes">{{ i18n.pick(t.notes) }}</label><textarea id="notes" formControlName="notes" rows="3" [class]="F"></textarea></div>
                <div class="flex flex-wrap items-center gap-6">
                  <app-button type="submit" variant="outline" [disabled]="busy()">{{ i18n.pick(t.saveDraft) }}</app-button>
                  @if (savedAt(); as s) { <span class="font-mono text-xs text-muted">{{ i18n.pick(t.saved) }} {{ s | date: 'shortTime' }}</span> }
                </div>
              </form>

              @if (currentCategory(); as cat) {
                <section class="space-y-4">
                  <h2 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.documents) }}</h2>
                  <p class="text-sm text-muted">{{ i18n.pick(t.documentsHint) }}</p>
                  <ul class="divide-y divide-hairline border-y border-hairline">
                    @for (r of cat.requirements; track r.docTypeKey) {
                      <li class="py-4">
                        <div class="flex flex-wrap items-center gap-3">
                          <span class="text-ink">{{ i18n.isArabic() ? r.nameAr : r.nameEn }}</span>
                          @if (r.required) { <span class="text-accent">*</span> }
                          @if (r.requiresExpiry) {
                            <input type="date" [value]="expiry(d, r.docTypeKey)" (change)="setExpiry(r.docTypeKey, $event)" class="ms-auto border-b border-hairline bg-transparent py-1 text-sm text-ink focus:border-accent focus:outline-none" [title]="i18n.pick(t.expiry)" />
                          }
                        </div>
                        <ul class="mt-2 space-y-1">
                          @for (doc of docsOf(d, r.docTypeKey); track doc.id) {
                            <li class="flex flex-wrap items-center gap-3 text-sm">
                              <button (click)="download(doc)" class="text-ink hover:text-accent" dir="ltr">{{ doc.originalFilename }}</button>
                              <span class="font-mono text-xs text-muted">{{ (doc.sizeBytes / 1024).toFixed(0) }} KB</span>
                              <button (click)="remove(doc)" [disabled]="busy()" class="font-mono text-[10px] uppercase tracking-[0.12em] text-red-600 hover:underline">{{ i18n.pick(t.remove) }}</button>
                            </li>
                          }
                        </ul>
                        <label class="mt-2 inline-flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink hover:text-accent">
                          <span class="border border-ink/30 px-3 py-1.5">{{ uploading() === r.docTypeKey ? i18n.pick(t.uploading) : i18n.pick(t.upload) }}</span>
                          <input type="file" class="sr-only" [accept]="accept" [disabled]="busy()" (change)="upload(r.docTypeKey, $event)" />
                        </label>
                      </li>
                    }
                  </ul>
                </section>
              }

              @if (error(); as e) { <p [class]="E" role="alert">{{ e }}</p> }
              <div class="border-t border-hairline pt-8">
                <app-button (click)="submitApplication()" [disabled]="busy()">{{ a.application.requestNumber ? i18n.pick(t.resubmit) : i18n.pick(t.submit) }}</app-button>
                <p class="mt-3 text-sm text-muted">{{ i18n.pick(t.submitHint) }}</p>
              </div>
            } @else if (a.submitted; as s) {
              <section>
                <h2 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.submittedDocs) }} · v{{ s.revisionNo }}</h2>
                <ul class="mt-4 divide-y divide-hairline border-y border-hairline">
                  @for (doc of s.documents; track doc.id) {
                    <li class="flex flex-wrap items-center gap-3 py-3 text-sm">
                      <span class="font-mono text-xs text-muted">{{ docTypeName(doc.docTypeKey) }}</span>
                      <button (click)="download(doc)" class="text-ink hover:text-accent" dir="ltr">{{ doc.originalFilename }}</button>
                      @if (doc.expiresAt) { <span class="font-mono text-xs text-muted">{{ i18n.pick(t.expires) }} {{ doc.expiresAt }}</span> }
                    </li>
                  }
                </ul>
              </section>
            }

            @if (a.history.length) {
              <section>
                <h2 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.history) }}</h2>
                <ol class="mt-4 divide-y divide-hairline border-y border-hairline">
                  @for (h of a.history; track h.at) {
                    <li class="py-3 text-sm"><span class="font-mono text-xs text-muted">{{ h.at | date: 'medium' }}</span><span class="ms-3 text-ink">{{ i18n.pick(action(h.action)) }}</span>@if (h.note) { <p class="mt-1 text-muted">{{ h.note }}</p> }</li>
                  }
                </ol>
              </section>
            }
          </div>
        </app-container>
      </section>
    }
  `,
})
export class VendorDashboardPage {
  protected readonly i18n = inject(TranslationService);
  protected readonly session = inject(VendorSession);
  private readonly api = inject(VendorsService);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly F = FIELD; protected readonly L = LABEL; protected readonly E = ERR; protected readonly accept = ACCEPT;

  protected readonly app = signal<MyApplication | null>(null);
  protected readonly categories = signal<VendorCategory[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly uploading = signal<string | null>(null);
  protected readonly savedAt = signal<Date | null>(null);
  protected readonly secondary = signal(new Set<string>());
  private readonly primaryKey = signal('');
  protected readonly countries = computed(() => countryOptions(this.i18n.isArabic() ? 'ar' : 'en'));
  protected readonly lastPinned = PINNED_COUNTRIES[PINNED_COUNTRIES.length - 1];
  protected readonly currentCategory = computed(() => this.categories().find((c) => c.key === this.primaryKey()) ?? null);

  protected readonly form = new FormBuilder().nonNullable.group({
    companyName: [''], companyNameEn: [''], commercialRegistrationNo: [''], vatNo: [''], country: [''], city: [''], website: [''], address: [''], specialty: [''],
    contactName: [''], email: [''], mobile: [''], phone: [''], primaryCategoryKey: [''], notes: [''],
  });

  protected readonly t = {
    eyebrow: { en: 'Vendor portal', ar: 'بوابة الموردين' }, signOut: { en: 'Sign out', ar: 'خروج' }, untitled: { en: 'Your application', ar: 'طلبك' },
    loading: { en: 'Loading…', ar: 'جارٍ التحميل…' }, retry: { en: 'Try again', ar: 'إعادة المحاولة' }, fromTeam: { en: 'From the review team', ar: 'من فريق المراجعة' },
    company: { en: 'Company', ar: 'بيانات الشركة' }, companyName: { en: 'Company name', ar: 'اسم الشركة' }, companyNameEn: { en: 'Company name (English)', ar: 'الاسم بالإنجليزية' },
    cr: { en: 'Commercial registration no.', ar: 'رقم السجل التجاري' }, vat: { en: 'VAT number', ar: 'الرقم الضريبي' }, country: { en: 'Country', ar: 'الدولة' }, city: { en: 'City', ar: 'المدينة' }, website: { en: 'Website', ar: 'الموقع الإلكتروني' },
    address: { en: 'Address', ar: 'العنوان' }, specialty: { en: 'Specialty', ar: 'التخصص' }, contact: { en: 'Contact person', ar: 'مسؤول التواصل' }, contactName: { en: 'Name', ar: 'الاسم' },
    email: { en: 'Email', ar: 'البريد الإلكتروني' }, mobile: { en: 'Mobile', ar: 'الجوال' }, phone: { en: 'Phone', ar: 'الهاتف' }, classification: { en: 'Classification', ar: 'التصنيف' },
    primary: { en: 'Primary category', ar: 'التصنيف الأساسي' }, secondary: { en: 'Also active in', ar: 'تصنيفات ثانوية (اختياري)' }, choose: { en: 'Choose…', ar: 'اختر…' }, notes: { en: 'Notes', ar: 'ملاحظات' },
    saveDraft: { en: 'Save draft', ar: 'حفظ المسودة' }, saved: { en: 'Saved', ar: 'حُفظ' }, documents: { en: 'Documents', ar: 'المستندات' },
    documentsHint: { en: `PDF, JPG, PNG, DOCX or XLSX · up to ${MAX_FILE_MB} MB per file. Each file is saved to our office the moment you choose it. Items marked * are required.`, ar: `PDF أو JPG أو PNG أو DOCX أو XLSX · حتى ${MAX_FILE_MB} م.ب للملف. كل ملف يُحفظ لدى المكتب فور اختياره. البنود المعلّمة بـ * إلزامية.` },
    expiry: { en: 'Expiry date', ar: 'تاريخ الانتهاء' }, expires: { en: 'expires', ar: 'ينتهي' }, upload: { en: 'Upload file', ar: 'رفع ملف' }, uploading: { en: 'Uploading…', ar: 'جارٍ الرفع…' }, remove: { en: 'Remove', ar: 'إزالة' },
    submit: { en: 'Submit application', ar: 'إرسال الطلب' }, resubmit: { en: 'Resubmit application', ar: 'إعادة إرسال الطلب' },
    submitHint: { en: 'Submitting locks this version for review. You will be notified by e-mail and here when the team responds.', ar: 'الإرسال يجمّد هذه النسخة للمراجعة. ستُبلَّغ بالبريد وهنا عند رد الفريق.' },
    submittedDocs: { en: 'Submitted documents', ar: 'المستندات المرسلة' }, history: { en: 'History', ar: 'السجل' },
    tooBig: { en: `File is larger than ${MAX_FILE_MB} MB`, ar: `الملف أكبر من ${MAX_FILE_MB} م.ب` }, badType: { en: 'File type not accepted', ar: 'نوع الملف غير مقبول' },
  };

  constructor() {
    this.seo.update({ title: 'Vendor dashboard', description: 'MSP vendor portal.' });
    if (!this.session.isLoggedIn()) { void this.router.navigate(['/vendors']); return; }
    this.form.controls.primaryCategoryKey.valueChanges.subscribe((k) => { this.primaryKey.set(k); this.secondary.update((s) => { const n = new Set(s); n.delete(k); return n; }); });
    this.load();
  }

  protected load(): void {
    this.loadError.set(null);
    forkJoin({ categories: this.api.categories(), app: this.api.mine() }).subscribe({
      next: ({ categories, app }) => { this.categories.set(categories); this.apply(app); },
      error: (e: HttpErrorResponse) => { if (e.status === 401) { this.session.end(); void this.router.navigate(['/vendors']); } else this.loadError.set(vendorErrorMessage(e, this.i18n.isArabic())); },
    });
  }

  private apply(app: MyApplication): void {
    this.app.set(app);
    const d = app.draft?.data;
    if (d) {
      const { secondaryCategoryKeys, expiries: _e, ...rest } = d;
      this.form.patchValue(rest as Record<string, string>, { emitEvent: false });
      this.primaryKey.set(d.primaryCategoryKey ?? '');
      this.secondary.set(new Set(secondaryCategoryKeys ?? []));
    }
  }

  protected status(a: MyApplication) { return STATUS[a.application.status] ?? STATUS['draft']; }
  protected action(k: string) { return ACTION[k] ?? { en: k, ar: k }; }
  protected docsOf(d: { documents: DocumentView[] }, type: string): DocumentView[] { return d.documents.filter((x) => x.docTypeKey === type); }
  protected expiry(d: { data: VendorProfile; documents: DocumentView[] }, type: string): string { return d.data.expiries?.[type] ?? d.documents.find((x) => x.docTypeKey === type)?.expiresAt ?? ''; }
  protected docTypeName(type: string): string {
    const r = this.categories().flatMap((c) => c.requirements).find((x) => x.docTypeKey === type);
    return r ? (this.i18n.isArabic() ? r.nameAr : r.nameEn) : type;
  }
  protected toggleSecondary(key: string): void { this.secondary.update((s) => { const n = new Set(s); n.has(key) ? n.delete(key) : n.add(key); return n; }); }
  protected signOut(): void { this.session.end(); void this.router.navigate(['/vendors']); }

  private patch(): VendorProfile { return { ...this.form.getRawValue(), secondaryCategoryKeys: [...this.secondary()] }; }

  protected save(): void {
    this.run(this.api.saveDraft(this.patch()), (app) => { this.apply(app); this.savedAt.set(new Date()); });
  }

  protected setExpiry(type: string, ev: Event): void {
    const value = (ev.target as HTMLInputElement).value;
    this.run(this.api.saveDraft({ expiries: { [type]: value } }), (app) => this.apply(app));
  }

  protected upload(type: string, ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set(null);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ACCEPT.split(',').includes(ext)) return this.error.set(this.i18n.pick(this.t.badType));
    if (file.size > MAX_FILE_MB * 1048576) return this.error.set(this.i18n.pick(this.t.tooBig));
    this.uploading.set(type);
    const expiresAt = this.app()?.draft ? this.expiry(this.app()!.draft!, type) : '';
    this.run(this.api.addDocument(type, file, expiresAt || undefined), () => this.reload(), () => this.uploading.set(null));
  }

  protected remove(doc: DocumentView): void {
    this.run(this.api.removeDocument(doc.id), () => this.reload());
  }

  protected submitApplication(): void {
    // Save the form first so nothing typed is lost, then submit; both are safe to repeat.
    this.run(this.api.saveDraft(this.patch()), () => this.run(this.api.submit(), () => this.reload()));
  }

  protected download(doc: DocumentView): void {
    this.api.myDocumentBlob(doc.id).subscribe({ next: (blob) => { const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = doc.originalFilename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 10_000); }, error: (e: HttpErrorResponse) => this.error.set(vendorErrorMessage(e, this.i18n.isArabic())) });
  }

  private reload(): void { this.api.mine().subscribe({ next: (app) => this.apply(app), error: (e: HttpErrorResponse) => this.error.set(vendorErrorMessage(e, this.i18n.isArabic())) }); }

  private run<T>(call: Observable<T>, onOk: (v: T) => void, always?: () => void): void {
    this.busy.set(true);
    this.error.set(null);
    call.subscribe({
      next: (v) => { this.busy.set(false); always?.(); onOk(v); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); always?.(); if (e.status === 401) { this.session.end(); void this.router.navigate(['/vendors']); } else this.error.set(vendorErrorMessage(e, this.i18n.isArabic())); },
    });
  }
}
