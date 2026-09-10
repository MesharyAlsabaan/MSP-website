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
  /** A wa.me link — renders a WhatsApp icon beside the value that opens a chat. */
  whatsapp?: string;
}

/** One office pin on the contact map. */
interface Office {
  city: L;
  coordinates: string;
  map: string;
  /** Position on the stylised map, as percentages of its box. */
  x: number;
  y: number;
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
                  <dd class="mt-2 flex items-center gap-3 text-lg text-ink" [attr.dir]="d.ltr ? 'ltr' : null">
                    @if (d.href) {
                      <a
                        [href]="d.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline decoration-hairline underline-offset-4 transition-colors hover:text-accent"
                      >{{ i18n.pick(d.value) }}</a>
                    } @else {
                      <span>{{ i18n.pick(d.value) }}</span>
                    }
                    @if (d.whatsapp) {
                      <!-- Straight to a WhatsApp chat with the number beside it. -->
                      <a
                        [href]="d.whatsapp"
                        target="_blank"
                        rel="noopener noreferrer"
                        [attr.aria-label]="i18n.pick(t.waChat)"
                        [title]="i18n.pick(t.waChat)"
                        class="inline-flex shrink-0 text-[#25D366] transition-opacity hover:opacity-75"
                      >
                        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
                          <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.67c2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.42 5.82c0 4.54-3.7 8.24-8.25 8.24-1.48 0-2.93-.4-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24Zm4.52 10.35c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43l-.48-.01c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.11-.22-.17-.47-.29Z"/>
                        </svg>
                      </a>
                    }
                  </dd>
                </div>
              }
            </dl>

            <!-- Map: a stylised board carrying both offices, each pin linking
                 to its location. Not a real tile map, so the two sit where
                 they read clearly rather than to exact scale. -->
            <div class="mt-10 aspect-[16/10] overflow-hidden border border-hairline">
              <div
                class="relative h-full w-full bg-surface"
                style="background-image: repeating-linear-gradient(0deg, var(--hairline) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--hairline) 0 1px, transparent 1px 40px);"
              >
                @for (o of offices; track o.coordinates) {
                  <a
                    [href]="o.map"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center text-center"
                    [style.left.%]="o.x"
                    [style.top.%]="o.y"
                    [attr.aria-label]="i18n.pick(o.city)"
                  >
                    <span
                      class="h-3 w-3 rounded-full bg-accent ring-4 ring-accent/20 transition-transform duration-300 group-hover:scale-125"
                    ></span>
                    <span class="mt-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ink">
                      {{ i18n.pick(o.city) }}
                    </span>
                    <span class="font-mono text-[0.6rem] tracking-[0.1em] text-muted" dir="ltr">
                      {{ o.coordinates }}
                    </span>
                  </a>
                }
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
    waChat: { en: 'Chat on WhatsApp', ar: 'محادثة عبر واتساب' },
  };

  /** Both offices, shown as pins on the map. Coordinates are printed as given;
   *  the map link uses their decimal form so it opens the right spot. */
  protected readonly offices: readonly Office[] = [
    {
      // The office's own Google listing (cid opens the MSP Designs card).
      city: { en: 'Riyadh', ar: 'الرياض' },
      coordinates: "24°41'N · 46°35'E",
      map: 'https://www.google.com/maps?cid=14819986877967963984',
      x: 66,
      y: 58,
    },
    {
      city: { en: 'Cairo', ar: 'القاهرة' },
      coordinates: "29°58'N · 31°18'E",
      map: 'https://www.google.com/maps?cid=7951323106422195141',
      x: 31,
      y: 34,
    },
  ];

  protected readonly details = computed<ContactDetail[]>(() => {
    const c = this.cfg();
    const mobile = c.whatsapp || '+966570327777';
    const result: ContactDetail[] = [
      { label: { en: 'Established', ar: 'سنة التأسيس' }, value: lv('2010'), ltr: true },
      { label: { en: 'Email', ar: 'البريد الإلكتروني' }, value: lv(c.email || 'info@msp.sa'), ltr: true, href: `mailto:${c.email || 'info@msp.sa'}` },
      { label: { en: 'Riyadh office telephone', ar: 'هاتف مكتب الرياض' }, value: lv(c.phone || '+966112000087'), ltr: true, href: `tel:${c.phone || '+966112000087'}` },
      {
        // The number calls when tapped; the icon beside it opens a WhatsApp chat.
        label: { en: 'Mobile / WhatsApp', ar: 'الجوال / واتساب' },
        value: lv(mobile),
        ltr: true,
        href: `tel:${mobile}`,
        whatsapp: `https://wa.me/${mobile.replace(/\D/g, '')}`,
      },
      {
        label: { en: 'Riyadh office', ar: 'فرع الرياض' },
        value: {
          en: c.addressEn || 'King Fahd Road, Riyadh, Saudi Arabia',
          ar: c.addressAr || 'طريق الملك فهد، الرياض، المملكة العربية السعودية',
        },
        href: c.mapUrl || 'https://www.google.com/maps?cid=14819986877967963984',
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
      whatsapp: `https://wa.me/${cairoPhone.replace(/\D/g, '')}`,
    });
    result.push({
      label: { en: 'Cairo branch', ar: 'فرع القاهرة' },
      value: {
        en: c.cairoAddressEn || 'Cairo, Egypt',
        ar: c.cairoAddressAr || 'القاهرة، مصر',
      },
      href: c.cairoMapUrl || 'https://www.google.com/maps?cid=7951323106422195141',
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
