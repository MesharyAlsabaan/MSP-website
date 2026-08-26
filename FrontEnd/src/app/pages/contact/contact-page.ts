import { Component, inject, signal, computed, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Container } from '../../shared/ui/container/container';
import { Button } from '../../shared/ui/button/button';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { ApiService } from '../../core/services/api.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { CompanyInfo } from '../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

interface ContactDetail {
  label: L;
  value: L;
  ltr?: boolean;
  href?: string;
}

/** Wrap a single string as the same value in both languages. */
function lv(s: string): L {
  return { en: s, ar: s };
}

/** Contact page — details, an enquiry form (UI-only), and studio info. */
@Component({
  selector: 'app-contact-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Container, Button, ScrollReveal],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>
        <h1
          appScrollReveal
          revealType="line"
          class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
        >
          {{ i18n.pick(t.title) }}
        </h1>
        <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {{ i18n.pick(t.intro) }}
        </p>
      </app-container>
    </section>

    <section class="py-16 sm:py-20">
      <app-container>
        <div class="grid gap-x-8 gap-y-12 lg:grid-cols-12">
          <!-- Details -->
          <div class="lg:col-span-5">
            <dl class="space-y-8">
              @for (d of details(); track d.label.en) {
                <div class="border-t border-hairline pt-4">
                  <dt class="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                    {{ i18n.pick(d.label) }}
                  </dt>
                  <dd class="mt-2 text-lg text-ink" [attr.dir]="d.ltr ? 'ltr' : null">
                    @if (d.href) {
                      <a
                        [href]="d.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline decoration-hairline underline-offset-4 transition-colors hover:text-accent"
                      >{{ i18n.pick(d.value) }}</a>
                    } @else {
                      {{ i18n.pick(d.value) }}
                    }
                  </dd>
                </div>
              }
            </dl>

            <!-- Map placeholder -->
            <div class="mt-10 aspect-[16/10] overflow-hidden border border-hairline">
              <div
                class="relative h-full w-full bg-surface"
                style="background-image: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--accent) 22%, transparent), transparent 60%), repeating-linear-gradient(0deg, var(--hairline) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--hairline) 0 1px, transparent 1px 40px);"
              >
                <span
                  class="absolute left-1/2 top-[45%] h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-4 ring-accent/20"
                ></span>
                <span
                  class="absolute bottom-3 left-3 font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted"
                >
                  24°38'N · 46°43'E
                </span>
              </div>
            </div>
          </div>

          <!-- Form -->
          <div class="lg:col-span-6 lg:col-start-7">
            @if (submitted()) {
              <div
                appScrollReveal
                class="flex h-full min-h-[20rem] flex-col items-start justify-center border-t border-hairline"
              >
                <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                  {{ i18n.pick(t.sentKicker) }}
                </span>
                <p class="mt-4 max-w-md t-section font-display font-medium leading-tight text-ink">
                  {{ i18n.pick(t.sentBody) }}
                </p>
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate class="space-y-8">
                <div>
                  <label [class]="labelClass" for="c-name">{{ i18n.pick(t.name) }}</label>
                  <input id="c-name" type="text" formControlName="name" [class]="fieldClass" [placeholder]="i18n.pick(t.namePh)" />
                  @if (showError('name')) {
                    <p [class]="errClass">{{ i18n.pick(t.errName) }}</p>
                  }
                </div>
                <div>
                  <label [class]="labelClass" for="c-email">{{ i18n.pick(t.email) }}</label>
                  <input id="c-email" type="email" formControlName="email" [class]="fieldClass" placeholder="you@company.com" />
                  @if (showError('email')) {
                    <p [class]="errClass">{{ i18n.pick(t.errEmail) }}</p>
                  }
                </div>
                <div>
                  <label [class]="labelClass" for="c-msg">{{ i18n.pick(t.message) }}</label>
                  <textarea id="c-msg" formControlName="message" rows="5" [class]="fieldClass" [placeholder]="i18n.pick(t.messagePh)"></textarea>
                  @if (showError('message')) {
                    <p [class]="errClass">{{ i18n.pick(t.errMessage) }}</p>
                  }
                </div>
                @if (sendError()) {
                  <p [class]="errClass">{{ i18n.pick(t.sendFailed) }}</p>
                }
                <app-button type="submit" [disabled]="sending()">
                  {{ sending() ? i18n.pick(t.sending) : i18n.pick(t.send) }}
                </app-button>
              </form>
            }
          </div>
        </div>
      </app-container>
    </section>
  `,
})
export class ContactPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly api = inject(ApiService);
  private readonly content = inject(PublicContentService);
  private readonly fb = new FormBuilder();

  /** Company/contact info from the API; falls back to the static defaults below. */
  private readonly cfg = signal<CompanyInfo>({});

  protected readonly submitted = signal(false);
  protected readonly sending = signal(false);
  protected readonly sendError = signal<string | null>(null);
  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly t = {
    eyebrow: { en: 'Contact', ar: 'تواصل معنا' },
    title: { en: 'Let’s talk.', ar: 'لنتحدّث.' },
    intro: {
      en: 'Tell us about your site and ambition. We reply within one business day.',
      ar: 'أخبرنا عن موقعك وطموحك، ونعود إليك خلال يوم عملٍ واحد.',
    },
    sentKicker: { en: 'Message received', ar: 'تمّ استلام رسالتك' },
    sentBody: { en: 'Thank you — we’ll be in touch within one business day.', ar: 'شكراً لك، سنتواصل معك خلال يوم عملٍ واحد.' },
    sending: { en: 'Sending…', ar: 'جارٍ الإرسال…' },
    sendFailed: { en: 'Could not send — please try again or email us.', ar: 'تعذّر الإرسال — حاول مجدداً أو راسلنا عبر البريد.' },
    name: { en: 'Name', ar: 'الاسم' },
    namePh: { en: 'Your name', ar: 'اسمك الكريم' },
    email: { en: 'Email', ar: 'البريد الإلكتروني' },
    message: { en: 'About your project', ar: 'نبذة عن مشروعك' },
    messagePh: { en: 'Site, scale, ambition…', ar: 'الموقع، والنطاق، والطموح…' },
    send: { en: 'Send enquiry →', ar: 'أرسل طلبك →' },
    errName: { en: 'Please enter your name.', ar: 'الرجاء إدخال اسمك.' },
    errEmail: { en: 'Please enter a valid email.', ar: 'الرجاء إدخال بريدٍ إلكترونيٍّ صحيح.' },
    errMessage: { en: 'Please add a little more detail.', ar: 'الرجاء إضافة مزيدٍ من التفاصيل.' },
  };

  protected readonly details = computed<ContactDetail[]>(() => {
    const c = this.cfg();
    const result: ContactDetail[] = [
      { label: { en: 'Established', ar: 'سنة التأسيس' }, value: lv('2010'), ltr: true },
      { label: { en: 'Email', ar: 'البريد الإلكتروني' }, value: lv(c.email || 'info@msp.sa'), ltr: true, href: `mailto:${c.email || 'info@msp.sa'}` },
      { label: { en: 'Riyadh office telephone', ar: 'هاتف مكتب الرياض' }, value: lv(c.phone || '+966112000087'), ltr: true, href: `tel:${c.phone || '+966112000087'}` },
      { label: { en: 'Mobile / WhatsApp', ar: 'الجوال / واتساب' }, value: lv(c.whatsapp || '+966570327777'), ltr: true, href: `https://wa.me/${(c.whatsapp || '+966570327777').replace(/\D/g, '')}` },
      {
        label: { en: 'Riyadh office', ar: 'فرع الرياض' },
        value: {
          en: c.addressEn || 'King Fahd Road, Riyadh, Saudi Arabia',
          ar: c.addressAr || 'طريق الملك فهد، الرياض، المملكة العربية السعودية',
        },
      },
      {
        label: { en: 'Hours', ar: 'ساعات العمل' },
        value: c.workingHours ?? { en: 'Sun–Thu · 9:00–17:00', ar: 'الأحد–الخميس · ٩:٠٠–١٧:٠٠' },
      },
    ];
    const cairoPhone = c.cairoPhone || '+201068017313';
    result.push({
      label: { en: 'Cairo telephone', ar: 'هاتف فرع القاهرة' },
      value: lv(cairoPhone),
      ltr: true,
      href: `tel:${cairoPhone}`,
    });
    result.push({
      label: { en: 'Cairo branch', ar: 'فرع القاهرة' },
      value: {
        en: c.cairoAddressEn || 'Cairo, Egypt',
        ar: c.cairoAddressAr || 'القاهرة، مصر',
      },
      href: c.cairoMapUrl || 'https://www.google.com/maps/place/MSP+DESIGNS/',
    });
    return result;
  });

  protected readonly labelClass = 'mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-muted';
  protected readonly fieldClass =
    'w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-lg text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none';
  protected readonly errClass = 'mt-2 font-mono text-xs uppercase tracking-[0.1em] text-accent';

  protected showError(c: 'name' | 'email' | 'message'): boolean {
    const ctrl = this.form.controls[c];
    return ctrl.invalid && (ctrl.touched || ctrl.dirty);
  }

  protected onSubmit(): void {
    if (this.form.invalid || this.sending()) {
      this.form.markAllAsTouched();
      return;
    }
    this.sending.set(true);
    this.sendError.set(null);
    this.api.post('contact', this.form.getRawValue()).subscribe({
      next: () => {
        this.sending.set(false);
        this.submitted.set(true);
      },
      error: () => {
        this.sending.set(false);
        this.sendError.set('failed');
      },
    });
  }

  constructor() {
    this.seo.update({
      title: 'Contact',
      description: 'Get in touch with MSP Consultants — architecture & engineering in Riyadh.',
    });

    afterNextRender(() => {
      this.content.settings().subscribe({
        next: (c) => this.cfg.set(c ?? {}),
        error: () => {},
      });
    });
  }
}
