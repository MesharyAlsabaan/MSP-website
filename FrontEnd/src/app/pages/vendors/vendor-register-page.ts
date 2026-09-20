import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Container } from '../../shared/ui/container/container';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { ChosenDocument, SubmitResult, VendorCategory, VendorProfile, VendorsService } from '../../core/services/vendors.service';
import { VendorForm } from './vendor-form';

/** Public vendor registration: profile + documents → reference numbers. */
@Component({
  selector: 'app-vendor-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, VendorForm],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-12 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>
        <h1 class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink">{{ i18n.pick(t.title) }}</h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{{ i18n.pick(t.intro) }}</p>
      </app-container>
    </section>

    <section class="py-14 sm:py-20">
      <app-container>
        <div class="relative mx-auto max-w-3xl">
          @if (result(); as r) {
            <div class="border-t border-hairline pt-8">
              <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">{{ i18n.pick(t.doneKicker) }}</span>
              <p class="mt-4 t-section font-display font-medium leading-tight text-ink">{{ i18n.pick(t.doneTitle) }}</p>
              <dl class="mt-8 grid gap-6 sm:grid-cols-2">
                <div class="border-t border-hairline pt-4">
                  <dt class="font-mono text-xs uppercase tracking-[0.15em] text-muted">{{ i18n.pick(t.requestNumber) }}</dt>
                  <dd class="mt-2 font-mono text-2xl text-ink" dir="ltr">{{ r.requestNumber }}</dd>
                </div>
                <div class="border-t border-hairline pt-4">
                  <dt class="font-mono text-xs uppercase tracking-[0.15em] text-muted">{{ i18n.pick(t.vendorNumber) }}</dt>
                  <dd class="mt-2 font-mono text-2xl text-ink" dir="ltr">{{ r.vendorNumber }}</dd>
                </div>
              </dl>
              <p class="mt-8 max-w-xl text-muted">{{ i18n.pick(t.doneBody) }}</p>
            </div>
          } @else if (categories(); as cats) {
            <app-vendor-form [categories]="cats" [busy]="busy()" [serverError]="serverError()" (submitted)="onSubmit($event)" />
          } @else if (loadError()) {
            <p class="text-muted">{{ i18n.pick(t.loadFailed) }}</p>
          } @else {
            <p class="text-muted">{{ i18n.pick(t.loading) }}</p>
          }
        </div>
      </app-container>
    </section>
  `,
})
export class VendorRegisterPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly vendors = inject(VendorsService);

  protected readonly categories = signal<VendorCategory[] | null>(null);
  protected readonly loadError = signal(false);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly result = signal<SubmitResult | null>(null);

  protected readonly t = {
    eyebrow: { en: 'Vendor qualification', ar: 'تأهيل الموردين' },
    title: { en: 'Register as a vendor', ar: 'سجّل كمورد معتمد' },
    intro: { en: 'Tell us about your company, choose your classification and upload the required documents. Our team reviews every application and replies by email.', ar: 'عرّفنا بشركتك، اختر تصنيفك، وارفع المستندات المطلوبة. يراجع فريقنا كل طلب ويرد عبر البريد الإلكتروني.' },
    loading: { en: 'Loading…', ar: 'جارٍ التحميل…' },
    loadFailed: { en: 'Could not load the form. Please try again later.', ar: 'تعذّر تحميل النموذج. يرجى المحاولة لاحقاً.' },
    doneKicker: { en: 'Application received', ar: 'تم استلام الطلب' },
    doneTitle: { en: 'Thank you — your application is under review.', ar: 'شكراً لك — طلبك الآن قيد المراجعة.' },
    doneBody: { en: 'Keep these numbers for reference. If anything is missing we will email you a secure link to complete the application.', ar: 'احتفظ بهذه الأرقام للمرجع. إذا احتاج الطلب أي استكمال سنرسل لك رابطاً آمناً عبر البريد لتحديثه.' },
    requestNumber: { en: 'Request number', ar: 'رقم الطلب' },
    vendorNumber: { en: 'Vendor number', ar: 'رقم المورد' },
  };

  constructor() {
    this.seo.update({ title: 'Vendor registration', description: 'Register as a qualified vendor with MSP Consultants.' });
    this.vendors.categories().subscribe({ next: (c) => this.categories.set(c), error: () => this.loadError.set(true) });
  }

  protected onSubmit(e: { profile: VendorProfile; documents: ChosenDocument[] }): void {
    this.busy.set(true);
    this.serverError.set(null);
    this.vendors.submit(e.profile, e.documents).subscribe({
      next: (r) => { this.busy.set(false); this.result.set(r); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.serverError.set(messageOf(err)); },
    });
  }
}

/** Turns the API error envelope into one line the vendor can act on. */
export function messageOf(err: HttpErrorResponse): string {
  const m = err.error?.message;
  if (Array.isArray(m)) return m.join(' · ');
  if (typeof m === 'string') return m;
  if (err.status === 429) return 'Too many attempts — please wait a minute and try again.';
  if (err.status === 413) return 'The documents are too large.';
  return 'Something went wrong. Please try again.';
}
