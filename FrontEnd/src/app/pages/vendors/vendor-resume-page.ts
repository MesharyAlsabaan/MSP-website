import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { ChosenDocument, ResumeContext, VendorCategory, VendorProfile, VendorsService } from '../../core/services/vendors.service';
import { VendorForm } from './vendor-form';
import { messageOf } from './vendor-register-page';

/**
 * Opened from the completion email. Shows what the reviewers asked for,
 * prefills the last submission, and resubmits as the next revision. The link
 * is one-time: after a successful resubmission it is spent.
 */
@Component({
  selector: 'app-vendor-resume-page',
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
        @if (ctx(); as c) {
          <p class="mt-4 font-mono text-sm text-muted" dir="ltr">{{ c.requestNumber }} · {{ c.vendorNumber }} · v{{ c.revisionNo }}</p>
        }
      </app-container>
    </section>

    <section class="py-14 sm:py-20">
      <app-container>
        <div class="relative mx-auto max-w-3xl">
          @if (done(); as d) {
            <div class="border-t border-hairline pt-8">
              <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">{{ i18n.pick(t.doneKicker) }}</span>
              <p class="mt-4 t-section font-display font-medium leading-tight text-ink">{{ i18n.pick(t.doneTitle) }}</p>
              <p class="mt-6 font-mono text-lg text-ink" dir="ltr">{{ d.requestNumber }} — v{{ d.revisionNo }}</p>
            </div>
          } @else if (linkError(); as e) {
            <div class="border-t border-hairline pt-8">
              <p class="t-section font-display font-medium leading-tight text-ink">{{ i18n.pick(e) }}</p>
            </div>
          } @else if (ctx(); as c) {
            <div class="mb-10 border border-accent/40 bg-accent/5 p-6">
              <p class="font-mono text-xs uppercase tracking-[0.15em] text-accent">{{ i18n.pick(t.missingTitle) }}</p>
              <ul class="mt-3 list-disc space-y-1 ps-6 text-ink">
                @for (m of c.missingItems; track m) { <li>{{ m }}</li> }
              </ul>
              @if (c.note) { <p class="mt-4 text-muted">{{ c.note }}</p> }
            </div>
            <app-vendor-form [categories]="categories()" [resume]="c" [busy]="busy()" [serverError]="serverError()" (submitted)="onSubmit($event)" />
          } @else {
            <p class="text-muted">{{ i18n.pick(t.loading) }}</p>
          }
        </div>
      </app-container>
    </section>
  `,
})
export class VendorResumePage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly vendors = inject(VendorsService);

  protected readonly categories = signal<VendorCategory[]>([]);
  protected readonly ctx = signal<ResumeContext | null>(null);
  protected readonly linkError = signal<{ en: string; ar: string } | null>(null);
  protected readonly busy = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly done = signal<{ requestNumber: string; revisionNo: number } | null>(null);
  private readonly token = this.route.snapshot.paramMap.get('token') ?? '';

  protected readonly t = {
    eyebrow: { en: 'Vendor qualification', ar: 'تأهيل الموردين' },
    title: { en: 'Complete your application', ar: 'استكمال طلب التأهيل' },
    loading: { en: 'Loading…', ar: 'جارٍ التحميل…' },
    missingTitle: { en: 'The review team asked for', ar: 'طلب فريق المراجعة' },
    doneKicker: { en: 'Resubmitted', ar: 'تمت إعادة الإرسال' },
    doneTitle: { en: 'Thank you — the updated application is back with our team.', ar: 'شكراً لك — الطلب المحدّث عاد إلى فريقنا للمراجعة.' },
    gone: { en: 'This link has already been used or has expired. If you still need to update your application, contact us and we will send a new one.', ar: 'هذا الرابط استُخدم من قبل أو انتهت صلاحيته. إذا كنت لا تزال بحاجة لتحديث طلبك فتواصل معنا لنرسل رابطاً جديداً.' },
    notFound: { en: 'This link is not valid.', ar: 'هذا الرابط غير صالح.' },
    notEditable: { en: 'This application cannot be edited at the moment.', ar: 'لا يمكن تعديل هذا الطلب حالياً.' },
  };

  constructor() {
    this.seo.update({ title: 'Complete your vendor application', description: 'Update and resubmit your vendor qualification application.' });
    forkJoin({ categories: this.vendors.categories(), ctx: this.vendors.resume(this.token) }).subscribe({
      next: ({ categories, ctx }) => { this.categories.set(categories); this.ctx.set(ctx); },
      error: (err: HttpErrorResponse) => this.linkError.set(err.status === 410 ? this.t.gone : err.status === 409 ? this.t.notEditable : this.t.notFound),
    });
  }

  protected onSubmit(e: { profile: VendorProfile; documents: ChosenDocument[] }): void {
    this.busy.set(true);
    this.serverError.set(null);
    this.vendors.resubmit(this.token, e.profile, e.documents).subscribe({
      next: (r) => { this.busy.set(false); this.done.set(r); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      error: (err: HttpErrorResponse) => { this.busy.set(false); this.serverError.set(messageOf(err)); },
    });
  }
}
