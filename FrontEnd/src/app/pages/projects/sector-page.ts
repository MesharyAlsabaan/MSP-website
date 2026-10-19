import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { LocPipe } from '../../shared/pipes/loc.pipe';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { SrcsetPipe } from '../../shared/pipes/srcset.pipe';
import { Cta } from '../home/sections/cta/cta';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { Project } from '../../core/data/projects';
import { MIN_SECTOR_PROJECTS, SECTOR_PAGES, projectsForSector } from '../../core/data/sector-pages';
import { SERVICE_PAGES } from '../../core/data/service-pages';
import { absoluteUrl } from '../../core/seo/structured-data';

/** A sector collection (/projects/sector/<slug>), e.g. all residential projects. */
@Component({
  selector: 'app-sector-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, Section, SectionHeading, LocPipe, AssetPipe, SrcsetPipe, Cta],
  template: `
    @if (status() === 'ready' && page(); as p) {
      <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
        <app-container>
          <a
            [routerLink]="'/projects' | loc"
            class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
          >
            <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
          </a>
          <h1 class="mt-8 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink">
            {{ i18n.pick(p.title) }}
          </h1>
          <p class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">{{ i18n.pick(p.intro) }}</p>
        </app-container>
      </section>

      <app-section>
        <app-container>
          <ul class="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            @for (project of projects(); track project.slug) {
              <li>
                <a [routerLink]="['/projects', project.slug] | loc" class="group block">
                  @if (project.cover | asset; as cover) {
                    <div class="aspect-[4/3] overflow-hidden bg-hairline/40">
                      <img
                        [src]="cover"
                        [attr.srcset]="project.cover | srcset"
                        sizes="(min-width: 1024px) 360px, (min-width: 640px) 46vw, 92vw"
                        [alt]="i18n.pick(project.title) + ' — ' + i18n.pick(project.location)"
                        width="800"
                        height="600"
                        loading="lazy"
                        decoding="async"
                        class="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                      />
                    </div>
                  }
                  <h2 class="mt-4 font-display text-xl font-medium text-ink transition-colors group-hover:text-accent">
                    {{ i18n.pick(project.title) }}
                  </h2>
                  <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ i18n.pick(project.location) }}</p>
                  <p class="mt-3 text-sm leading-relaxed text-muted">{{ i18n.pick(project.summary) }}</p>
                </a>
              </li>
            }
          </ul>
        </app-container>
      </app-section>

      @if (services().length) {
        <app-section tone="surface">
          <app-container>
            <app-section-heading index="—" [eyebrow]="i18n.pick(t.servicesEyebrow)" [title]="i18n.pick(t.servicesTitle)" />
            <ul class="mt-10 flex flex-wrap gap-3">
              @for (sp of services(); track sp.slug) {
                <li>
                  <a
                    [routerLink]="['/services', sp.slug] | loc"
                    class="inline-block border border-hairline px-4 py-2.5 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:border-ink hover:text-accent"
                  >
                    {{ i18n.pick(sp.title) }}
                  </a>
                </li>
              }
            </ul>
          </app-container>
        </app-section>
      }

      <app-cta />
    } @else if (status() === 'notfound') {
      <section class="flex min-h-[60vh] items-center">
        <app-container>
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">404</p>
          <h1 class="mt-4 font-display text-4xl font-medium text-ink sm:text-5xl">{{ i18n.pick(t.notFound) }}</h1>
          <a
            [routerLink]="'/projects' | loc"
            class="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent"
          >
            <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
          </a>
        </app-container>
      </section>
    }
  `,
})
export class SectorPage {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);
  private readonly route = inject(ActivatedRoute);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('sector') ?? '')), { initialValue: '' });
  protected readonly page = computed(() => SECTOR_PAGES.find((p) => p.slug === this.slug()) ?? null);

  private readonly all = signal<Project[] | null>(null);
  protected readonly projects = computed(() => {
    const page = this.page();
    const all = this.all();
    return page && all ? projectsForSector(page, all) : [];
  });

  /** loading until the list arrives; notfound for unknown or under-filled sectors. */
  protected readonly status = computed<'loading' | 'ready' | 'notfound'>(() => {
    if (!this.page()) return 'notfound';
    if (this.all() === null) return 'loading';
    return this.projects().length >= MIN_SECTOR_PROJECTS ? 'ready' : 'notfound';
  });

  protected readonly services = computed(() =>
    (this.page()?.services ?? [])
      .map((slug) => SERVICE_PAGES.find((sp) => sp.slug === slug && sp.approved))
      .filter((sp) => !!sp),
  );

  protected readonly t = {
    back: { en: 'All projects', ar: 'كل المشاريع' },
    servicesEyebrow: { en: 'Services', ar: 'الخدمات' },
    servicesTitle: { en: 'Services for these projects.', ar: 'خدمات لهذا النوع من المشاريع.' },
    notFound: { en: 'No projects in this sector yet.', ar: 'لا توجد مشاريع في هذا القطاع بعد.' },
  };

  constructor() {
    this.content.projects().subscribe({ next: (list) => this.all.set(list), error: () => this.all.set([]) });

    effect(() => {
      const status = this.status();
      const page = this.page();
      if (status === 'loading') return;
      if (status === 'notfound' || !page) {
        this.seo.update({ title: this.i18n.pick(this.t.notFound).replace(/\.$/, ''), noindex: true });
        return;
      }
      this.seo.update({
        title: this.i18n.pick(page.seoTitle),
        description: this.i18n.pick(page.seoDescription),
        type: 'CollectionPage',
        schema: [
          {
            '@type': 'ItemList',
            '@id': `${absoluteUrl(this.i18n.path(`/projects/sector/${page.slug}`))}#projects`,
            itemListElement: this.projects().map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: absoluteUrl(this.i18n.path(`/projects/${p.slug}`)),
              name: this.i18n.pick(p.title),
            })),
          },
        ],
      });
    });
  }
}
