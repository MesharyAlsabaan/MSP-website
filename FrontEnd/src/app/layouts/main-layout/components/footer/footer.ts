import { Component, inject, signal, computed, afterNextRender, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Container } from '../../../../shared/ui/container/container';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { CompanyInfo } from '../../../../core/models/content.model';

interface NavLink {
  readonly path: string;
  readonly label: { en: string; ar: string };
}

@Component({
  selector: 'app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container],
  template: `
    <footer class="border-t border-hairline bg-surface">
      <app-container>
        <div class="grid gap-12 py-16 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <a
              routerLink="/"
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
                    [routerLink]="item.path"
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
              {{ i18n.pick(contactHeading) }}
            </p>
            <ul class="mt-5 space-y-3 text-sm text-muted">
              <li>
                <a [href]="'mailto:' + emailValue()" class="transition-colors hover:text-ink">{{ emailValue() }}</a>
              </li>
              <li dir="ltr">
                <a [href]="'tel:' + phoneValue()" class="transition-colors hover:text-ink">{{ phoneValue() }}</a>
              </li>
              @if (whatsappValue()) {
                <li dir="ltr">
                  <a [href]="whatsappLink()" target="_blank" rel="noopener noreferrer" class="transition-colors hover:text-ink">{{ whatsappValue() }}</a>
                </li>
              }
              <li>{{ i18n.pick(addressValue()) }}</li>
              @if (cairoPhoneValue()) {
                <li dir="ltr">
                  <a [href]="'tel:' + cairoPhoneValue()" class="transition-colors hover:text-ink">{{ cairoPhoneValue() }}</a>
                </li>
              }
              @if (cairoMapUrl()) {
                <li>
                  <a
                    [href]="cairoMapUrl()"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="transition-colors hover:text-ink"
                  >{{ i18n.pick(cairoBranchLabel) }}</a>
                </li>
              }
            </ul>
          </div>
        </div>

        <div
          class="flex flex-col gap-3 border-t border-hairline py-6 font-mono text-xs uppercase tracking-[0.12em] text-muted sm:flex-row sm:items-center sm:justify-between"
        >
          <p>© {{ year }} {{ i18n.pick(legal) }}</p>
          <p>{{ i18n.pick(strap) }}</p>
        </div>
      </app-container>
    </footer>
  `,
})
export class Footer {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);
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
    () => this.cfg().cairoMapUrl || 'https://www.google.com/maps/place/MSP+DESIGNS/',
  );
  protected readonly addressValue = computed(() => {
    const c = this.cfg();
    if (c.addressEn || c.addressAr) {
      return { en: c.addressEn ?? '', ar: c.addressAr ?? c.addressEn ?? '' };
    }
    return this.address;
  });

  constructor() {
    afterNextRender(() => {
      this.content.settings().subscribe({
        next: (c) => this.cfg.set(c ?? {}),
        error: () => {},
      });
    });
  }

  protected readonly tagline = {
    en: 'An architecture & engineering consultancy designing buildings, infrastructure, and cities that endure.',
    ar: 'بيتُ خبرةٍ في العمارة والهندسة، نُصمّم مبانٍ وبنىً تحتيةً ومدناً تدوم.',
  };
  protected readonly city = { en: 'Riyadh · Saudi Arabia', ar: 'الرياض · المملكة العربية السعودية' };
  protected readonly established = { en: 'Established 2010', ar: 'تأسس عام 2010' };
  protected readonly navHeading = { en: 'Navigate', ar: 'تصفّح' };
  protected readonly contactHeading = { en: 'Contact', ar: 'تواصل معنا' };
  protected readonly cairoBranchLabel = { en: 'Cairo branch · Google Maps', ar: 'فرع القاهرة · خرائط Google' };
  protected readonly address = { en: 'King Fahd Road, Riyadh', ar: 'طريق الملك فهد، الرياض' };
  protected readonly legal = { en: 'MSP Consultants', ar: 'إم إس بي للاستشارات' };
  protected readonly strap = {
    en: 'Architecture · Structure · Infrastructure',
    ar: 'عمارة · إنشاءات · بنية تحتية',
  };

  protected readonly links: readonly NavLink[] = [
    { path: '/about', label: { en: 'Practice', ar: 'المكتب' } },
    { path: '/services', label: { en: 'Disciplines', ar: 'التخصصات' } },
    { path: '/projects', label: { en: 'Works', ar: 'الأعمال' } },
    { path: '/team', label: { en: 'Studio', ar: 'الفريق' } },
    { path: '/blog', label: { en: 'Journal', ar: 'المدوّنة' } },
    { path: '/careers', label: { en: 'Careers', ar: 'الوظائف' } },
  ];
}
