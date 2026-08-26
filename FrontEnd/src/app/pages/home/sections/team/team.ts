import {
  Component,
  inject,
  signal,
  computed,
  afterNextRender,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Section } from '../../../../shared/ui/section/section';
import { Container } from '../../../../shared/ui/container/container';
import { SectionHeading } from '../../../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../../../shared/directives/scroll-reveal.directive';
import { AssetPipe } from '../../../../shared/pipes/asset.pipe';
import { TranslationService } from '../../../../core/services/translation.service';
import { PublicContentService } from '../../../../core/services/public-content.service';
import { TeamMember } from '../../../../core/models/content.model';

interface L {
  en: string;
  ar: string;
}

/** Unified card shape used for both the API data and the static fallback. */
interface Member {
  readonly key: string;
  readonly name: string;
  readonly role: L;
  readonly image: string;
}

/** Section 07 — Studio: the people behind the practice. */
@Component({
  selector: 'app-team',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Section, Container, SectionHeading, ScrollReveal, AssetPipe],
  template: `
    <app-section tone="surface">
      <app-container>
        <app-section-heading
          index="07"
          [eyebrow]="i18n.pick(t.eyebrow)"
          [title]="i18n.pick(t.title)"
          [intro]="i18n.pick(t.intro)"
        />

        @if (loading()) {
          <div class="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            @for (item of skeletons; track item) {
              <div class="animate-pulse">
                <div class="aspect-[4/5] bg-hairline/50"></div>
                <div class="mt-5 h-6 w-2/3 bg-hairline/50"></div>
                <div class="mt-3 h-3 w-1/3 bg-hairline/40"></div>
              </div>
            }
          </div>
        } @else if (members().length) {
        <div class="mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          @for (member of members(); track member.key; let i = $index) {
            <article appScrollReveal [revealDelay]="i * 70" class="group">
              <div appScrollReveal revealType="line" class="aspect-[4/5] overflow-hidden bg-hairline/40">
                @if (member.image) {
                  <img
                    [src]="member.image | asset"
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
              <h3
                class="mt-5 font-display text-xl font-medium text-ink transition-colors group-hover:text-accent"
              >
                {{ member.name }}
              </h3>
              <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">
                {{ i18n.pick(member.role) }}
              </p>
            </article>
          }
        </div>
        } @else {
          <p class="py-16 text-center font-mono text-xs uppercase tracking-[0.14em] text-muted">
            {{ i18n.pick(t.empty) }}
          </p>
        }
      </app-container>
    </app-section>
  `,
})
export class Team {
  protected readonly i18n = inject(TranslationService);
  private readonly content = inject(PublicContentService);

  /** Team from the API. Bundled sample people are never rendered. */
  private readonly fetched = signal<Member[]>([]);
  protected readonly loading = signal(true);
  protected readonly skeletons = [0, 1, 2, 3];

  protected readonly members = computed<Member[]>(
    // Studio order as set in the admin; a member without a portrait gets the
    // same monogram tile the /team page uses, so nobody is silently dropped.
    () => this.fetched().slice(0, 4),
  );

  constructor() {
    afterNextRender(() => {
      this.content.team().subscribe({
        next: (list) => {
          this.fetched.set(list.map(toMember));
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
    });
  }

  protected readonly t = {
    eyebrow: { en: 'Studio', ar: 'الفريق' },
    title: { en: 'A senior team, by design.', ar: 'نخبةٌ من الخبراء، باختيارٍ دقيق.' },
    intro: {
      en: 'Principals lead every commission — supported by a tight group of architects and engineers.',
      ar: 'يقود الشركاءُ كلَّ مشروعٍ بأنفسهم، تسندهم نخبةٌ من المعماريين والمهندسين.',
    },
    placeholder: { en: 'Portrait placeholder', ar: 'صورة افتراضية' },
    empty: { en: 'Team members will appear here.', ar: 'سيظهر أعضاء الفريق هنا.' },
  };

  protected initials(name: string): string {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
}

/** Maps an API team member onto the card shape rendered by this section. */
function toMember(m: TeamMember): Member {
  return { key: m.id, name: m.name, role: m.title, image: m.photo };
}
