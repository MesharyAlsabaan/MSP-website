import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Container } from '../../shared/ui/container/container';
import { Button } from '../../shared/ui/button/button';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { VendorSession } from '../../core/services/vendor-session.service';
import { VendorsService, vendorErrorMessage } from '../../core/services/vendors.service';

export const FIELD = 'w-full border-0 border-b border-hairline bg-transparent px-0 py-3 text-base text-ink placeholder:text-muted/60 transition-colors focus:border-accent focus:outline-none';
export const LABEL = 'mb-2 block font-mono text-xs uppercase tracking-[0.12em] text-muted';
export const ERR = 'mt-3 font-mono text-xs uppercase tracking-[0.1em] text-accent';

/** Narrow page frame shared by the vendor account screens. */
@Component({
  selector: 'app-vendor-frame',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-10 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick({ en: 'Vendor portal', ar: 'بوابة الموردين' }) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>
        <h1 class="mt-8 max-w-3xl t-display font-display font-medium tracking-[-0.035em] text-ink"><ng-content select="[title]" /></h1>
      </app-container>
    </section>
    <section class="py-14 sm:py-20"><app-container><div class="mx-auto max-w-md"><ng-content /></div></app-container></section>
  `,
})
export class VendorFrame { protected readonly i18n = inject(TranslationService); }

@Component({
  selector: 'app-vendor-login-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, VendorFrame, Button],
  template: `
    <app-vendor-frame>
      <span title>{{ i18n.pick(t.title) }}</span>
      <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-8">
        <div><label [class]="L" for="l-email">{{ i18n.pick(t.email) }}</label><input id="l-email" type="email" formControlName="email" [class]="F" dir="ltr" autocomplete="email" /></div>
        <div><label [class]="L" for="l-pass">{{ i18n.pick(t.password) }}</label><input id="l-pass" type="password" formControlName="password" [class]="F" dir="ltr" autocomplete="current-password" /></div>
        @if (error(); as e) { <p [class]="E" role="alert">{{ e }}</p> }
        <div class="flex flex-wrap items-center gap-6">
          <app-button type="submit" [disabled]="busy() || form.invalid">{{ i18n.pick(t.signIn) }}</app-button>
          <a routerLink="/vendors/forgot-password" class="font-mono text-xs uppercase tracking-[0.12em] text-muted hover:text-accent">{{ i18n.pick(t.forgot) }}</a>
        </div>
        <p class="text-sm text-muted">{{ i18n.pick(t.noAccount) }} <a routerLink="/vendors/register" class="text-accent underline-offset-4 hover:underline">{{ i18n.pick(t.register) }}</a></p>
      </form>
    </app-vendor-frame>
  `,
})
export class VendorLoginPage {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(VendorsService);
  private readonly session = inject(VendorSession);
  private readonly router = inject(Router);
  private readonly seo = inject(SeoService);
  protected readonly F = FIELD; protected readonly L = LABEL; protected readonly E = ERR;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormBuilder().nonNullable.group({ email: ['', [Validators.required, Validators.email]], password: ['', Validators.required] });
  protected readonly t = {
    title: { en: 'Sign in to your vendor account', ar: 'دخول حساب المورد' }, email: { en: 'Email', ar: 'البريد الإلكتروني' }, password: { en: 'Password', ar: 'كلمة المرور' },
    signIn: { en: 'Sign in', ar: 'دخول' }, forgot: { en: 'Forgot password?', ar: 'نسيت كلمة المرور؟' }, noAccount: { en: 'New supplier?', ar: 'مورد جديد؟' }, register: { en: 'Create an account', ar: 'أنشئ حساباً' },
  };
  constructor() {
    this.seo.update({ title: 'Vendor sign in', description: 'MSP vendor portal.' });
    if (this.session.isLoggedIn()) void this.router.navigate(['/vendors/dashboard']);
  }
  protected submit(): void {
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.api.login(email, password).subscribe({
      next: (r) => { this.session.start(r.accessToken, r.account); void this.router.navigate(['/vendors/dashboard']); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.status === 403 ? this.i18n.pick({ en: 'Please verify your e-mail first (check your inbox).', ar: 'فعّل بريدك أولاً (تحقق من صندوق الوارد).' }) : vendorErrorMessage(e, this.i18n.isArabic())); },
    });
  }
}

@Component({
  selector: 'app-vendor-register-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, VendorFrame, Button],
  template: `
    <app-vendor-frame>
      <span title>{{ i18n.pick(t.title) }}</span>
      @if (done()) {
        <div class="border-t border-hairline pt-8">
          <span class="font-mono text-xs uppercase tracking-[0.15em] text-accent">{{ i18n.pick(t.doneKicker) }}</span>
          <p class="mt-4 text-lg text-ink">{{ i18n.pick(t.doneBody) }}</p>
          <p class="mt-6 text-sm text-muted">{{ i18n.pick(t.noMail) }} <button (click)="resend()" class="text-accent underline-offset-4 hover:underline">{{ i18n.pick(t.resend) }}</button></p>
        </div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-8">
          <div><label [class]="L" for="r-name">{{ i18n.pick(t.name) }}</label><input id="r-name" formControlName="contactName" [class]="F" autocomplete="name" /></div>
          <div><label [class]="L" for="r-email">{{ i18n.pick(t.email) }}</label><input id="r-email" type="email" formControlName="email" [class]="F" dir="ltr" autocomplete="email" /></div>
          <div><label [class]="L" for="r-pass">{{ i18n.pick(t.password) }}</label><input id="r-pass" type="password" formControlName="password" [class]="F" dir="ltr" autocomplete="new-password" /><p class="mt-2 text-xs text-muted">{{ i18n.pick(t.passwordHint) }}</p></div>
          @if (error(); as e) { <p [class]="E" role="alert">{{ e }}</p> }
          <app-button type="submit" [disabled]="busy() || form.invalid">{{ i18n.pick(t.create) }}</app-button>
          <p class="text-sm text-muted">{{ i18n.pick(t.haveAccount) }} <a routerLink="/vendors" class="text-accent underline-offset-4 hover:underline">{{ i18n.pick(t.signIn) }}</a></p>
        </form>
      }
    </app-vendor-frame>
  `,
})
export class VendorRegisterPage {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(VendorsService);
  private readonly seo = inject(SeoService);
  protected readonly F = FIELD; protected readonly L = LABEL; protected readonly E = ERR;
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly form = new FormBuilder().nonNullable.group({ contactName: ['', Validators.required], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]] });
  protected readonly t = {
    title: { en: 'Create your vendor account', ar: 'إنشاء حساب مورد' }, name: { en: 'Contact person', ar: 'اسم مسؤول التواصل' }, email: { en: 'Email', ar: 'البريد الإلكتروني' },
    password: { en: 'Password', ar: 'كلمة المرور' }, passwordHint: { en: 'At least 8 characters.', ar: '8 أحرف على الأقل.' }, create: { en: 'Create account', ar: 'إنشاء الحساب' },
    haveAccount: { en: 'Already registered?', ar: 'لديك حساب؟' }, signIn: { en: 'Sign in', ar: 'دخول' },
    doneKicker: { en: 'Check your inbox', ar: 'تحقق من بريدك' }, doneBody: { en: 'We sent you a verification link. Open it to activate your account, then sign in and prepare your application.', ar: 'أرسلنا لك رابط تفعيل. افتحه لتفعيل حسابك، ثم سجّل الدخول وجهّز طلبك.' },
    noMail: { en: "Didn't get it?", ar: 'لم تصلك الرسالة؟' }, resend: { en: 'Send again', ar: 'إعادة الإرسال' },
  };
  constructor() { this.seo.update({ title: 'Vendor registration', description: 'Create an MSP vendor account.' }); }
  protected submit(): void {
    if (this.form.invalid) return;
    this.busy.set(true); this.error.set(null);
    const { email, password, contactName } = this.form.getRawValue();
    this.api.register(email, password, contactName).subscribe({
      next: () => { this.busy.set(false); this.done.set(true); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(vendorErrorMessage(e, this.i18n.isArabic())); },
    });
  }
  protected resend(): void { this.api.resendVerification(this.form.getRawValue().email).subscribe(); }
}

@Component({
  selector: 'app-vendor-verify-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, VendorFrame],
  template: `
    <app-vendor-frame>
      <span title>{{ i18n.pick(t.title) }}</span>
      <p class="text-lg text-ink">{{ i18n.pick(state()) }}</p>
      @if (state() === t.ok) { <a routerLink="/vendors" class="mt-6 inline-block font-mono text-xs uppercase tracking-[0.12em] text-accent">{{ i18n.pick(t.signIn) }} →</a> }
    </app-vendor-frame>
  `,
})
export class VendorVerifyPage {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(VendorsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly t = {
    title: { en: 'Account activation', ar: 'تفعيل الحساب' }, working: { en: 'Activating…', ar: 'جارٍ التفعيل…' },
    ok: { en: 'Your account is active. You can sign in now.', ar: 'تم تفعيل حسابك. يمكنك تسجيل الدخول الآن.' },
    gone: { en: 'This link was already used or has expired. Sign in and request a new one.', ar: 'هذا الرابط استُخدم أو انتهت صلاحيته. سجّل الدخول لطلب رابط جديد.' },
    bad: { en: 'This link is not valid.', ar: 'الرابط غير صالح.' }, signIn: { en: 'Sign in', ar: 'دخول' },
  };
  protected readonly state = signal(this.t.working);
  constructor() {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.api.verify(token).subscribe({ next: () => this.state.set(this.t.ok), error: (e: HttpErrorResponse) => this.state.set(e.status === 410 ? this.t.gone : this.t.bad) });
  }
}

@Component({
  selector: 'app-vendor-forgot-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, VendorFrame, Button],
  template: `
    <app-vendor-frame>
      <span title>{{ i18n.pick(t.title) }}</span>
      @if (done()) { <p class="text-lg text-ink">{{ i18n.pick(t.done) }}</p> } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-8">
          <div><label [class]="L" for="f-email">{{ i18n.pick(t.email) }}</label><input id="f-email" type="email" formControlName="email" [class]="F" dir="ltr" /></div>
          @if (error(); as e) { <p [class]="E" role="alert">{{ e }}</p> }
          <app-button type="submit" [disabled]="busy() || form.invalid">{{ i18n.pick(t.send) }}</app-button>
        </form>
      }
    </app-vendor-frame>
  `,
})
export class VendorForgotPage {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(VendorsService);
  protected readonly F = FIELD; protected readonly L = LABEL; protected readonly E = ERR;
  protected readonly busy = signal(false); protected readonly done = signal(false); protected readonly error = signal<string | null>(null);
  protected readonly form = new FormBuilder().nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly t = { title: { en: 'Reset your password', ar: 'استعادة كلمة المرور' }, email: { en: 'Email', ar: 'البريد الإلكتروني' }, send: { en: 'Send reset link', ar: 'إرسال رابط الاستعادة' }, done: { en: 'If that address has an account, a reset link is on its way.', ar: 'إن كان البريد مسجلاً لدينا فسيصلك رابط الاستعادة.' } };
  protected submit(): void {
    this.busy.set(true); this.error.set(null);
    this.api.forgotPassword(this.form.getRawValue().email).subscribe({ next: () => { this.busy.set(false); this.done.set(true); }, error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(vendorErrorMessage(e, this.i18n.isArabic())); } });
  }
}

@Component({
  selector: 'app-vendor-reset-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, VendorFrame, Button],
  template: `
    <app-vendor-frame>
      <span title>{{ i18n.pick(t.title) }}</span>
      @if (done()) { <p class="text-lg text-ink">{{ i18n.pick(t.done) }} <a routerLink="/vendors" class="text-accent underline-offset-4 hover:underline">{{ i18n.pick(t.signIn) }}</a></p> } @else {
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate class="space-y-8">
          <div><label [class]="L" for="p-pass">{{ i18n.pick(t.password) }}</label><input id="p-pass" type="password" formControlName="password" [class]="F" dir="ltr" autocomplete="new-password" /></div>
          @if (error(); as e) { <p [class]="E" role="alert">{{ e }}</p> }
          <app-button type="submit" [disabled]="busy() || form.invalid">{{ i18n.pick(t.save) }}</app-button>
        </form>
      }
    </app-vendor-frame>
  `,
})
export class VendorResetPage {
  protected readonly i18n = inject(TranslationService);
  private readonly api = inject(VendorsService);
  private readonly route = inject(ActivatedRoute);
  protected readonly F = FIELD; protected readonly L = LABEL; protected readonly E = ERR;
  protected readonly busy = signal(false); protected readonly done = signal(false); protected readonly error = signal<string | null>(null);
  protected readonly form = new FormBuilder().nonNullable.group({ password: ['', [Validators.required, Validators.minLength(8)]] });
  protected readonly t = { title: { en: 'Choose a new password', ar: 'كلمة مرور جديدة' }, password: { en: 'New password (8+ characters)', ar: 'كلمة المرور الجديدة (8 أحرف فأكثر)' }, save: { en: 'Save password', ar: 'حفظ كلمة المرور' }, done: { en: 'Password updated.', ar: 'تم تحديث كلمة المرور.' }, signIn: { en: 'Sign in', ar: 'دخول' } };
  protected submit(): void {
    this.busy.set(true); this.error.set(null);
    this.api.resetPassword(this.route.snapshot.paramMap.get('token') ?? '', this.form.getRawValue().password).subscribe({
      next: () => { this.busy.set(false); this.done.set(true); },
      error: (e: HttpErrorResponse) => { this.busy.set(false); this.error.set(e.status === 410 ? this.i18n.pick({ en: 'This link was already used or has expired.', ar: 'الرابط استُخدم أو انتهت صلاحيته.' }) : vendorErrorMessage(e, this.i18n.isArabic())); },
    });
  }
}
