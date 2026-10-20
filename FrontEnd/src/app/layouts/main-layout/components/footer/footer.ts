import { Component, inject, signal, computed, ChangeDetectionStrategy, afterNextRender } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Container } from '../../../../shared/ui/container/container';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { CompanyInfo } from '../../../../core/models/content.model';
import { LocPipe } from '../../../../shared/pipes/loc.pipe';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { ConsentService } from '../../../../core/services/consent.service';
import { SERVICE_PAGES } from '../../../../core/data/service-pages';

interface NavLink {
  readonly path: string;
  readonly label: { en: string; ar: string };
}

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, LocPipe],
  template: `
    <footer class="border-t border-hairline bg-surface">
      <app-container>
        <div class="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <a
              [routerLink]="'/' | loc"
              class="font-display text-3xl font-semibold tracking-[-0.02em] text-ink"
            >
              MSP
            </a>
            <p class="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {{ i18n.pick(taglineValue()) }}
            </p>
            <p class="mt-6 font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {{ i18n.pick(city) }}
            </p>
            <p class="mt-2 font-mono text-xs uppercase tracking-[0.15em] text-muted">
              {{ i18n.pick(established) }}
            </p>
          </div>

          <div>
            <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {{ i18n.pick(navHeading) }}
            </p>
            <ul class="mt-5 space-y-3">
              @for (item of links; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path | loc"
                    class="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {{ i18n.pick(item.label) }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <div>
            <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {{ i18n.pick(servicesHeading) }}
            </p>
            <ul class="mt-5 space-y-3">
              @for (sp of servicePages; track sp.slug) {
                <li>
                  <a
                    [routerLink]="['/services', sp.slug] | loc"
                    class="text-sm text-muted transition-colors hover:text-ink"
                  >
                    {{ i18n.pick(sp.title) }}
                  </a>
                </li>
              }
            </ul>
          </div>

          <div>
            <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">
              {{ i18n.pick(contactHeading) }}
            </p>
            <ul class="mt-5 space-y-3 text-sm text-muted">
              <li>
                <a [href]="'mailto:' + emailValue()" class="transition-colors hover:text-ink">{{ emailValue() }}</a>
              </li>
              <li>
                <a dir="ltr" [href]="'tel:' + phoneValue()" class="transition-colors hover:text-ink">{{ phoneValue() }}</a>
              </li>
              @if (whatsappValue()) {
                <li>
                  <a dir="ltr" [href]="whatsappLink()" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-ink">{{ whatsappValue() }}</a>
                </li>
              }
              <li>
                <a [href]="mapUrl()" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-ink">{{ i18n.pick(addressValue()) }}</a>
              </li>
              @if (cairoPhoneValue()) {
                <li>
                  <a dir="ltr" [href]="'tel:' + cairoPhoneValue()" class="transition-colors hover:text-ink">{{ cairoPhoneValue() }}</a>
                </li>
              }
              @if (cairoMapUrl()) {
                <li>
                  <a
                    [href]="cairoMapUrl()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="transition-colors hover:text-ink"
                  >{{ i18n.pick(cairoAddressValue()) }}</a>
                </li>
              }
            </ul>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-hairline py-6 font-mono text-xs uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between"
        >
          <p>
            © {{ year }} {{ i18n.pick(legal) }}
            @if (showAnalyticsChoice()) {
              <button type="button" (click)="consent.reset()" class="ms-4 uppercase underline underline-offset-4 hover:text-ink">
                {{ i18n.pick(analyticsChoice) }}
              </button>
            }
          </p>
          <p>{{ i18n.pick(strap) }}</p>
        </div>
      </app-container>
    </footer>
  `,
})
export class Footer {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);
  private readonly analytics = inject(AnalyticsService);
  protected readonly consent = inject(ConsentService);
  /** Set after hydration (analytics configuration is browser-only). */
  protected readonly showAnalyticsChoice = signal(false);
  protected readonly analyticsChoice = { en: 'Analytics choice', ar: 'خيار التحليلات' };
  protected readonly year = 2026;

  /** Company/contact info from the API; falls back to the static defaults below. */
  private readonly cfg = signal<CompanyInfo>({});

  protected readonly taglineValue = computed(() => this.cfg().tagline ?? this.tagline);
  protected readonly emailValue = computed(() => this.cfg().email || 'info@msp.sa');
  protected readonly phoneValue = computed(() => this.cfg().phone || '+966112000087');
  protected readonly whatsappValue = computed(() => this.cfg().whatsapp || '+966570327777');
  protected readonly whatsappLink = computed(
    () => `https://wa.me/${this.whatsappValue().replace(/\D/g, '')}`,
  );
  protected readonly cairoPhoneValue = computed(() => this.cfg().cairoPhone || '+201068017313');
  protected readonly cairoMapUrl = computed(
    () => this.cfg().cairoMapUrl || 'https://www.google.com/maps?cid=7951323106422195141',
  );
  protected readonly mapUrl = computed(() => this.cfg().mapUrl || 'https://www.google.com/maps?cid=14819986877967963984');
  protected readonly cairoAddressValue = computed(() => {
    const c = this.cfg();
    if (c.cairoAddressEn || c.cairoAddressAr) {
      return { en: c.cairoAddressEn ?? '', ar: c.cairoAddressAr ?? c.cairoAddressEn ?? '' };
    }
    return this.cairoAddress;
  });
  protected readonly addressValue = computed(() => {
    const c = this.cfg();
    if (c.addressEn || c.addressAr) {
      return { en: c.addressEn ?? '', ar: c.addressAr ?? c.addressEn ?? '' };
    }
    return this.address;
  });

  constructor() {
    afterNextRender(() => this.showAnalyticsChoice.set(this.analytics.configured));
    this.content.settings().subscribe({
      next: (c) => this.cfg.set(c ?? {}),
      error: () => {},
    });
  }

  protected readonly tagline = {
    en: 'A multidisciplinary architecture and engineering consultancy creating environments that enrich human experience and deliver lasting value.',
    ar: 'مكتب استشارات معمارية وهندسية متعدّد التخصصات، يصنع بيئات تُثري التجربة الإنسانية وتحقّق قيمة دائمة.',
  };
  protected readonly city = { en: 'Riyadh · Saudi Arabia', ar: 'الرياض · المملكة العربية السعودية' };
  protected readonly established = { en: 'Established 2010', ar: 'تأسست عام 2010' };
  protected readonly navHeading = { en: 'Navigate', ar: 'تصفّح' };
  protected readonly servicesHeading = { en: 'Services', ar: 'الخدمات' };
  /** Every approved service page, linked from every page of the site. */
  protected readonly servicePages = SERVICE_PAGES.filter((sp) => sp.approved);
  protected readonly contactHeading = { en: 'Contact', ar: 'تواصل معنا' };
  protected readonly address = { en: 'Irqah, Riyadh', ar: 'حي عرقة، الرياض' };
  protected readonly cairoAddress = { en: 'Rayhana Plaza, Maadi, Cairo', ar: 'ريحانة بلازا، المعادي، القاهرة' };
  protected readonly legal = { en: 'MSP', ar: 'MSP' };
  protected readonly strap = {
    en: 'Architecture Beyond Buildings',
    ar: 'عمارةٌ تتجاوز المباني',
  };

  protected readonly links: readonly NavLink[] = [
    { path: '/about', label: { en: 'About', ar: 'عن المكتب' } },
    { path: '/services', label: { en: 'Services', ar: 'الخدمات' } },
    { path: '/projects', label: { en: 'Projects', ar: 'المشاريع' } },
    { path: '/team', label: { en: 'Team', ar: 'الفريق' } },
    { path: '/blog', label: { en: 'Insights', ar: 'الرؤى' } },
    { path: '/careers', label: { en: 'Careers', ar: 'الوظائف' } },
  ];
}
