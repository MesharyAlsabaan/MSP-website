import { Component, inject, signal, computed, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { Button } from '../../../../shared/ui/button/button';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { CompanyInfo } from '../../../../core/models/content.model';

interface ContactItem {
  label: string;
  value: string;
  ltr?: boolean;
  href?: string;
}

/**
 * Section 11 — Contact: studio details plus a reactive enquiry form.
 * UI-only for now — submitting shows a local success state; no HTTP call is
 * made until the backend exists.
 */
@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, Section, Container, Button, ScrollReveal],
  template: `
    <app-section>
      <app-container>
        <div
          class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted"
        >
          <span class="text-accent">(11)</span>
          <span>{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>

        <div class="mt-12 grid gap-x-8 gap-y-12 lg:grid-cols-12">
          <div class="lg:col-span-5">
            <h2
              appScrollReveal
              revealType="line"
              class="t-section font-display font-medium tracking-[-0.03em] text-ink"
            >
              {{ i18n.pick(t.headingPre)
              }}<span class="italic text-accent">{{ i18n.pick(t.headingEm) }}</span>
            </h2>

            <dl class="mt-12 space-y-8">
              @for (detail of i18n.pick(details()); track detail.label) {
                <div class="border-t border-hairline pt-4">
                  <dt class="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                    {{ detail.label }}
                  </dt>
                  <dd class="mt-2 text-lg text-ink" [attr.dir]="detail.ltr ? 'ltr' : null">
                    @if (detail.href) {
                      <a
                        [href]="detail.href"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="underline decoration-hairline underline-offset-4 transition-colors hover:text-accent"
                      >{{ detail.value }}</a>
                    } @else {
                      {{ detail.value }}
                    }
                  </dd>
                </div>
              }
            </dl>
          </div>

          <div class="lg:col-span-6 lg:col-start-7">
            @if (submitted()) {
              <div
                appScrollReveal
                class="flex h-full min-h-[20rem] flex-col items-start justify-center border-t border-hairline"
              >
                <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">
                  {{ i18n.pick(t.sentKicker) }}
                </span>
                <p class="mt-4 max-w-md font-display text-3xl font-medium leading-tight text-ink">
                  {{ i18n.pick(t.sentBody) }}
                </p>
              </div>
            } @else {
              <form
                appScrollReveal
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                novalidate
                class="space-y-8"
              >
                <div>
                  <label [class]="labelClass" for="contact-name">{{ i18n.pick(t.name) }}</label>
                  <input
                    id="contact-name"
                    type="text"
                    formControlName="name"
                    [class]="fieldClass"
                    [placeholder]="i18n.pick(t.namePh)"
                  />
                  @if (showError('name')) {
                    <p [class]="errorClass">{{ i18n.pick(t.errName) }}</p>
                  }
                </div>

                <div>
                  <label [class]="labelClass" for="contact-email">{{ i18n.pick(t.email) }}</label>
                  <input
                    id="contact-email"
                    type="email"
                    formControlName="email"
                    [class]="fieldClass"
                    placeholder="you@company.com"
                  />
                  @if (showError('email')) {
                    <p [class]="errorClass">{{ i18n.pick(t.errEmail) }}</p>
                  }
                </div>

                <div>
                  <label [class]="labelClass" for="contact-message">{{ i18n.pick(t.message) }}</label>
                  <textarea
                    id="contact-message"
                    formControlName="message"
                    rows="4"
                    [class]="fieldClass"
                    [placeholder]="i18n.pick(t.messagePh)"
                  ></textarea>
                  @if (showError('message')) {
                    <p [class]="errorClass">{{ i18n.pick(t.errMessage) }}</p>
                  }
                </div>

                <app-button type="submit">{{ i18n.pick(t.send) }}</app-button>
              </form>
            }
          </div>
        </div>
      </app-container>
    </app-section>
  `,
})
export class Contact {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);
  private readonly fb = new FormBuilder();
  private readonly cfg = signal<CompanyInfo>({});

  protected readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly t = {
    eyebrow: { en: 'Contact', ar: 'تواصل معنا' },
    headingPre: { en: 'Start a ', ar: 'لنتحدّث عن ' },
    headingEm: { en: 'conversation.', ar: 'مشروعك.' },
    sentKicker: { en: 'Message received', ar: 'تمّ استلام رسالتك' },
    sentBody: {
      en: "Thank you. We'll be in touch within one business day.",
      ar: 'شكراً لك، سنتواصل معك خلال يوم عملٍ واحد.',
    },
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

  protected readonly labelClass =
    'mb-3 block font-mono text-xs uppercase tracking-[0.12em] text-muted';
  protected readonly fieldClass =
    'w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-lg text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none';
  protected readonly errorClass = 'mt-2 font-mono text-xs uppercase tracking-[0.1em] text-accent';

  protected readonly details = computed<{ en: ContactItem[]; ar: ContactItem[] }>(() => {
    const c = this.cfg();
    const cairoMapUrl = c.cairoMapUrl || 'https://www.google.com/maps/place/MSP+DESIGNS/';
    return {
      en: [
        { label: 'Established', value: '2010', ltr: true },
        { label: 'Email', value: c.email || 'info@msp.sa', ltr: true, href: `mailto:${c.email || 'info@msp.sa'}` },
        { label: 'Riyadh office telephone', value: c.phone || '+966112000087', ltr: true, href: `tel:${c.phone || '+966112000087'}` },
        { label: 'Mobile / WhatsApp', value: c.whatsapp || '+966570327777', ltr: true, href: `https://wa.me/${(c.whatsapp || '+966570327777').replace(/\D/g, '')}` },
        { label: 'Riyadh office', value: c.addressEn || 'Riyadh, Saudi Arabia' },
        { label: 'Cairo telephone', value: c.cairoPhone || '+201068017313', ltr: true, href: `tel:${c.cairoPhone || '+201068017313'}` },
        { label: 'Cairo branch', value: c.cairoAddressEn || 'Cairo, Egypt', href: cairoMapUrl },
      ],
      ar: [
        { label: 'سنة التأسيس', value: '2010', ltr: true },
        { label: 'البريد الإلكتروني', value: c.email || 'info@msp.sa', ltr: true, href: `mailto:${c.email || 'info@msp.sa'}` },
        { label: 'هاتف مكتب الرياض', value: c.phone || '+966112000087', ltr: true, href: `tel:${c.phone || '+966112000087'}` },
        { label: 'الجوال / واتساب', value: c.whatsapp || '+966570327777', ltr: true, href: `https://wa.me/${(c.whatsapp || '+966570327777').replace(/\D/g, '')}` },
        { label: 'فرع الرياض', value: c.addressAr || 'الرياض، المملكة العربية السعودية' },
        { label: 'هاتف فرع القاهرة', value: c.cairoPhone || '+201068017313', ltr: true, href: `tel:${c.cairoPhone || '+201068017313'}` },
        { label: 'فرع القاهرة', value: c.cairoAddressAr || 'القاهرة، مصر', href: cairoMapUrl },
      ],
    };
  });

  protected showError(control: 'name' | 'email' | 'message'): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitted.set(true);
  }

  constructor() {
    afterNextRender(() => {
      this.content.settings().subscribe({
        next: (c) => this.cfg.set(c ?? {}),
        error: () => {},
      });
    });
  }
}
