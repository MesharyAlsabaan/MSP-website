import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { PublicContentService } from '../../core/services/public-content.service';
import { SeoService } from '../../core/services/seo.service';
import { TranslationService } from '../../core/services/translation.service';
import { TeamMember } from '../../core/models/content.model';

/** Public team index backed exclusively by active records from the content API. */
@Component({
  selector: 'app-team-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Container, ScrollReveal, AssetPipe],
  template: `
    <section class="border-b border-hairline bg-bg pt-16 pb-12 sm:pt-20">
      <app-container>
        <div class="flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
          <span class="text-accent">{{ i18n.pick(t.eyebrow) }}</span>
          <span class="h-px flex-1 bg-hairline"></span>
        </div>
        <h1
          appScrollReveal
          revealType="line"
          class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
        >{{ i18n.pick(t.title) }}</h1>
        <p class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
          {{ i18n.pick(t.intro) }}
        </p>
      </app-container>
    </section>

    <section class="py-16 sm:py-20">
      <app-container>
        @if (loading()) {
          <div class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (item of skeletons; track item) {
              <div class="animate-pulse">
                <div class="aspect-[4/5] bg-hairline/50"></div>
                <div class="mt-5 h-6 w-2/3 bg-hairline/50"></div>
                <div class="mt-3 h-3 w-1/3 bg-hairline/40"></div>
              </div>
            }
          </div>
        } @else if (members().length) {
          <div class="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (member of members(); track member.id; let i = $index) {
              <article appScrollReveal [revealDelay]="i * 50" class="group">
                <div class="aspect-[4/5] overflow-hidden bg-hairline/40">
                  @if (member.photo) {
                    <img
                      [src]="member.photo | asset"
                      [alt]="member.name"
                      loading="lazy"
                      decoding="async"
                      class="h-full w-full object-cover grayscale transition-all duration-700 group-hover:scale-[1.04] group-hover:grayscale-0"
                    />
                  } @else {
                    <div
                      class="flex h-full w-full items-center justify-center bg-surface font-display text-5xl text-muted"
                      role="img"
                      [attr.aria-label]="i18n.pick(t.placeholder) + ': ' + member.name"
                    >{{ initials(member.name) }}</div>
                  }
                </div>
                <h2 class="mt-5 font-display text-xl font-medium text-ink">
                  {{ member.name }}
                </h2>
                <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                  {{ i18n.pick(member.title) }}
                </p>
                @if (i18n.pick(member.bio)) {
                  <p class="mt-4 text-sm leading-relaxed text-muted">
                    {{ i18n.pick(member.bio) }}
                  </p>
                }
              </article>
            }
          </div>
        } @else {
          <p class="py-16 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {{ i18n.pick(t.empty) }}
          </p>
        }
      </app-container>
    </section>
  `,
})
export class TeamPage {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);
  private readonly seo = inject(SeoService);

  protected readonly members = signal<TeamMember[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3, 4, 5, 6, 7];

  protected readonly t = {
    eyebrow: { en: 'Studio', ar: 'الفريق' },
    title: { en: 'The people behind the work.', ar: 'الفريقُ الذي يقف خلف أعمالنا.' },
    intro: {
      en: 'A focused team of architects, engineers, and specialists working as one practice.',
      ar: 'فريقٌ متكامل من المعماريين والمهندسين والمتخصصين يعمل ضمن منظومةٍ واحدة.',
    },
    empty: { en: 'Team profiles are being prepared.', ar: 'يجري تجهيز ملفات أعضاء الفريق.' },
    placeholder: { en: 'Portrait placeholder', ar: 'صورة افتراضية' },
  };

  constructor() {
    this.seo.update({
      title: 'Studio',
      description: 'Meet the architects, engineers, and specialists at MSP.',
    });

    afterNextRender(() => {
      this.content.team().subscribe({
        next: (list) => {
          this.members.set([...list].sort((a, b) => a.sortOrder - b.sortOrder));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}

