import {
  Component,
  inject,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, switchMap, catchError, startWith, of } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { Parallax } from '../../shared/directives/parallax.directive';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { Lightbox } from '../../shared/ui/lightbox/lightbox';
import { assetUrl } from '../../core/utils/asset-url';
import { L, Project } from '../../core/data/projects';
import { DISCIPLINES, SECTORS, Term, label } from '../../core/data/taxonomy';
import { sectorsOf } from '../../core/data/project-filter';
import { LocPipe } from '../../shared/pipes/loc.pipe';
import { SrcsetPipe } from '../../shared/pipes/srcset.pipe';
import { JsonLd, ORG_ID, absoluteUrl } from '../../core/seo/structured-data';
import { SERVICE_PAGES } from '../../core/data/service-pages';

type LoadState =
  | { status: 'loading'; project: null }
  | { status: 'loaded'; project: Project }
  | { status: 'notfound'; project: null };

/** Project detail page — cover, specs, description, gallery, next project (from the API). */
@Component({
  selector: 'app-project-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, RouterLink, Container, ScrollReveal, Parallax, AssetPipe, Lightbox, LocPipe, SrcsetPipe],
  template: `
    @if (status() === 'loading') {
      <section class="pt-12 pb-10 sm:pt-16">
        <app-container>
          <div class="animate-pulse">
            <div class="h-3 w-24 bg-hairline/60"></div>
            <div class="mt-8 h-12 w-3/4 bg-hairline/60"></div>
            <div class="mt-6 h-4 w-1/2 bg-hairline/40"></div>
            <div class="mt-12 aspect-[16/9] bg-hairline/40"></div>
          </div>
        </app-container>
      </section>
    } @else if (project(); as p) {
      <article>
        <!-- Header -->
        <section class="border-b border-hairline bg-bg pt-12 pb-10 sm:pt-16">
          <app-container>
            <a
              [routerLink]="'/projects' | loc"
              class="group inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted transition-colors hover:text-ink"
            >
              <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
            </a>

            <div class="mt-8 flex items-center gap-5 font-mono text-xs uppercase tracking-[0.18em] text-muted">
              <span class="text-accent">{{ p.no }}</span>
              <span>{{ i18n.pick(metaLabel(p)) }}</span>
              <span class="h-px flex-1 bg-hairline"></span>
              @if (p.year) {
                <span data-project-year dir="ltr">{{ p.year }}</span>
              }
            </div>

            <h1
              appScrollReveal
              revealType="line"
              class="mt-6 max-w-4xl t-display font-display font-medium tracking-[-0.035em] text-ink"
            >
              {{ i18n.pick(p.title) }}
            </h1>
            <p appScrollReveal [revealDelay]="120" class="mt-6 max-w-2xl text-lg leading-relaxed text-muted">
              {{ i18n.pick(p.summary) }}
            </p>
          </app-container>
        </section>

        <!-- Cover -->
        @if (p.cover) {
          <div class="mx-auto max-w-[1200px] px-5 py-12 sm:px-8 sm:py-16">
            <div appScrollReveal revealType="line" class="aspect-[16/9] overflow-hidden">
              <div appParallax [parallaxSpeed]="0.05" class="-mt-[6%] h-[112%] w-full">
                <img
                  sizes="(min-width: 1200px) 1136px, 92vw"
                  [attr.srcset]="p.cover | srcset"
                  [src]="p.cover | asset"
                  width="1600"
                  height="900"
                  [alt]="coverAlt(p)"
                  class="h-full w-full object-cover"
                  fetchpriority="high"
                />
              </div>
            </div>
          </div>
        }

        <!-- Description + specs -->
        <section class="pb-16 pt-12">
          <app-container>
            <div class="grid gap-12 lg:grid-cols-12 lg:gap-8">
              <div class="lg:col-span-7">
                <!-- Case-study text from the CMS. A paragraph starting with
                     "## " is a section heading (Design challenge, Our approach,
                     …), so editors can structure a case study without a schema
                     change; nothing is shown for sections that don't exist. -->
                @for (block of body(p); track $index; let first = $first) {
                  @if (block.heading) {
                    <h2 class="mb-4 mt-10 font-display text-2xl font-medium tracking-[-0.02em] text-ink first:mt-0">
                      {{ block.text }}
                    </h2>
                  } @else {
                    @if (first) {
                      <h2 class="mb-6 font-mono text-xs uppercase tracking-[0.15em] text-accent">
                        {{ i18n.pick(t.overview) }}
                      </h2>
                    }
                    <p appScrollReveal class="mb-6 text-lg leading-relaxed text-ink/90">
                      {{ block.text }}
                    </p>
                  }
                }
              </div>

              <aside class="lg:col-span-4 lg:col-start-9">
                @if (p.specs.length || i18n.pick(p.location)) {
                  <dl class="border-t border-hairline">
                    @if (i18n.pick(p.location)) {
                      <div class="flex justify-between gap-6 border-b border-hairline py-4">
                        <dt class="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                          {{ i18n.pick(t.location) }}
                        </dt>
                        <dd class="text-end text-sm text-ink">{{ i18n.pick(p.location) }}</dd>
                      </div>
                    }
                    @for (spec of p.specs; track $index) {
                      <div class="flex justify-between gap-6 border-b border-hairline py-4">
                        <dt class="font-mono text-xs uppercase tracking-[0.12em] text-muted">
                          {{ i18n.pick(spec.label) }}
                        </dt>
                        <dd class="text-end text-sm text-ink">{{ i18n.pick(spec.value) }}</dd>
                      </div>
                    }
                  </dl>
                }

                @if (scope(p).length) {
                  <p class="mt-8 font-mono text-xs uppercase tracking-[0.15em] text-accent">
                    {{ i18n.pick(t.services) }}
                  </p>
                  <!-- Scope tags: a project usually carries several disciplines,
                       so they read as a set rather than a ranked list. This is
                       the work MSP did, not a filter — the works page's two
                       filter rows are a separate pair of axes. -->
                  <ul class="mt-4 flex flex-wrap gap-2">
                    @for (item of scopeItems(p); track $index) {
                      <li>
                        @if (item.page) {
                          <a
                            [routerLink]="['/services', item.page] | loc"
                            class="block border border-hairline px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-colors hover:border-ink hover:text-accent"
                          >
                            {{ i18n.pick(item.label) }}
                          </a>
                        } @else {
                          <span class="block border border-hairline px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] text-ink">
                            {{ i18n.pick(item.label) }}
                          </span>
                        }
                      </li>
                    }
                  </ul>
                  <a
                    [routerLink]="'/services' | loc"
                    class="mt-6 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:text-accent"
                  >
                    {{ i18n.pick(t.servicesLink) }} <span class="dir-flip">&rarr;</span>
                  </a>
                }
              </aside>
            </div>
          </app-container>
        </section>

        <!-- Gallery -->
        @if (p.gallery.length) {
          <section class="pb-16">
            <app-container>
              <div class="grid gap-6 sm:grid-cols-2">
                @for (img of p.gallery; track $index; let i = $index) {
                  <button
                    type="button"
                    appScrollReveal
                    revealType="line"
                    (click)="openViewer(i)"
                    (contextmenu)="blockSave($event)"
                    [attr.aria-label]="i18n.pick(t.enlarge) + ': ' + i18n.pick(p.title)"
                    class="group relative block w-full cursor-zoom-in overflow-hidden"
                    [ngClass]="
                      i === 0
                        ? 'sm:col-span-2 aspect-[16/9]'
                        : 'aspect-[4/3]'
                    "
                  >
                    <img
                      [sizes]="i === 0 ? fullSizes : halfSizes"
                      [attr.srcset]="img | srcset"
                      [src]="img | asset"
                      width="1200"
                      [attr.height]="i === 0 ? 675 : 900"
                      [alt]="galleryAlt(p, i)"
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                      (dragstart)="blockSave($event)"
                      class="pointer-events-none h-full w-full select-none object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                    <span
                      class="absolute inset-0 bg-scrim/0 transition-colors duration-300 group-hover:bg-scrim/15"
                      aria-hidden="true"
                    ></span>
                  </button>
                }
              </div>
            </app-container>
          </section>

          <app-lightbox
            [images]="p.gallery"
            [caption]="i18n.pick(p.title)"
            [(index)]="viewerIndex"
            [(open)]="viewerOpen"
          />
        }

        <!-- Contact -->
        <section class="border-t border-hairline py-12 sm:py-14">
          <app-container>
            <div class="flex flex-wrap items-baseline justify-between gap-6">
              <p class="max-w-xl text-lg leading-relaxed text-ink/90">{{ i18n.pick(t.discuss) }}</p>
              <a
                [routerLink]="'/contact' | loc"
                class="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink transition-colors hover:text-accent"
              >
                {{ i18n.pick(t.contact) }} <span class="dir-flip">&rarr;</span>
              </a>
            </div>
          </app-container>
        </section>

        <!-- Next project -->
        @if (next(); as nx) {
          <section class="border-t border-hairline py-16 sm:py-20">
            <app-container>
              <a [routerLink]="['/projects', nx.slug] | loc" class="group block">
                <p class="font-mono text-xs uppercase tracking-[0.18em] text-muted">
                  {{ i18n.pick(t.next) }}
                </p>
                <div class="mt-4 flex items-baseline justify-between gap-6">
                  <h2
                    class="t-section font-display font-medium tracking-[-0.03em] text-ink transition-colors group-hover:text-accent"
                  >
                    {{ i18n.pick(nx.title) }}
                  </h2>
                  <span class="dir-flip shrink-0 font-display text-3xl text-accent transition-transform duration-300 group-hover:translate-x-2 rtl:group-hover:-translate-x-2">&rarr;</span>
                </div>
              </a>
            </app-container>
          </section>
        }
      </article>
    } @else {
      <section class="flex min-h-[60vh] items-center">
        <app-container>
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">404</p>
          <h1 class="mt-4 font-display text-4xl font-medium text-ink sm:text-5xl">
            {{ i18n.pick(t.notFound) }}
          </h1>
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
export class ProjectDetail {
  /** `sizes` for the gallery: the first image spans both columns. */
  protected readonly fullSizes = '(min-width: 1200px) 1136px, 92vw';
  protected readonly halfSizes = '(min-width: 1200px) 552px, (min-width: 640px) 46vw, 92vw';

  protected readonly i18n = inject(TranslationService);
  private readonly route = inject(ActivatedRoute);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);

  /** Fetches the project for the current slug, with loading/loaded/notfound states. */
  private readonly state = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('slug') ?? ''),
      switchMap((slug) =>
        this.content.projectBySlug(slug).pipe(
          map((project) => ({ status: 'loaded', project } as LoadState)),
          catchError(() => of({ status: 'notfound', project: null } as LoadState)),
          startWith({ status: 'loading', project: null } as LoadState),
        ),
      ),
    ),
    { initialValue: { status: 'loading', project: null } as LoadState },
  );

  protected readonly status = computed(() => this.state().status);
  protected readonly project = computed(() => this.state().project);

  /** Full list (for the "next project" link and unique page titles). */
  private readonly all = signal<Project[]>([]);

  protected readonly next = computed(() => {
    const current = this.project();
    const list = this.all();
    if (!current || list.length === 0) return null;
    const idx = list.findIndex((p) => p.slug === current.slug);
    if (idx === -1) return list[0];
    return list[(idx + 1) % list.length];
  });

  /** Full-screen viewer state for the gallery. */
  protected readonly viewerOpen = signal(false);
  protected readonly viewerIndex = signal(0);

  protected openViewer(index: number): void {
    this.viewerIndex.set(index);
    this.viewerOpen.set(true);
  }

  /** Right-click / drag on a gallery image: viewing is allowed, saving is not. */
  protected blockSave(event: Event): boolean {
    event.preventDefault();
    return false;
  }

  /** The scope MSP carried; older records still only have the free-text list. */
  protected scope(project: Project): readonly L[] {
    const disciplines = project.disciplines ?? [];
    return disciplines.length
      ? disciplines.map((term) => label(DISCIPLINES, term))
      : project.services;
  }

  /** Scope labels, each linked to its service page when exactly one matches. */
  protected scopeItems(project: Project): { label: L; page: string | null }[] {
    const disciplines = project.disciplines ?? [];
    if (!disciplines.length) return project.services.map((label) => ({ label, page: null }));
    return disciplines.map((term) => {
      const pages = SERVICE_PAGES.filter((sp) => sp.approved && sp.discipline === term.key);
      return { label: label(DISCIPLINES, term), page: pages.length === 1 ? pages[0].slug : null };
    });
  }

  /** Header meta names the sector, falling back to the legacy category. */
  protected metaLabel(project: Project): Term {
    const [first] = sectorsOf(project);
    return first ? label(SECTORS, first) : project.typology;
  }

  protected readonly t = {
    back: { en: 'All works', ar: 'كل الأعمال' },
    enlarge: { en: 'View larger', ar: 'عرض مكبّر' },
    services: { en: 'Scope & Disciplines', ar: 'نطاق العمل والتخصصات' },
    next: { en: 'Next project', ar: 'المشروع التالي' },
    notFound: { en: 'Project not found.', ar: 'المشروع غير موجود.' },
    overview: { en: 'Project overview', ar: 'نظرة عامة على المشروع' },
    location: { en: 'Location', ar: 'الموقع' },
    servicesLink: { en: 'About these services', ar: 'تعرّف على هذه الخدمات' },
    discuss: {
      en: 'Planning a project with similar ambitions? We would welcome a conversation.',
      ar: 'هل تخطط لمشروع بطموحات مماثلة؟ يسعدنا أن نتحدث معك.',
    },
    contact: { en: 'Contact MSP', ar: 'تواصل مع MSP' },
  };

  /** Description paragraphs, with "## " paragraphs promoted to headings. */
  protected body(project: Project): { heading: boolean; text: string }[] {
    return project.description.map((para) => {
      const text = this.i18n.pick(para).trim();
      return text.startsWith('## ')
        ? { heading: true, text: text.slice(3).trim() }
        : { heading: false, text };
    });
  }

  protected coverAlt(project: Project): string {
    const title = this.i18n.pick(project.title);
    const place = this.i18n.pick(project.location);
    return place && !title.includes(place) ? `${title} — ${place}` : title;
  }

  /** Unique, accurate alt per image: the project, its place, and the image's position. */
  protected galleryAlt(project: Project, index: number): string {
    const n = project.gallery.length;
    return this.i18n.pick({
      en: `${this.coverAlt(project)}, image ${index + 1} of ${n}`,
      ar: `${this.coverAlt(project)}، الصورة ${index + 1} من ${n}`,
    });
  }

  /**
   * Page title: the project name, plus its number when another published
   * project shares the name (three villas are called "Private Residential
   * Villa"), so every page title stays unique.
   */
  private pageTitle(project: Project): string {
    const title = this.i18n.pick(project.title);
    const twins = this.all().filter((p) => this.i18n.pick(p.title) === title).length;
    return twins > 1 && project.no ? `${title} ${project.no}` : title;
  }

  private schema(project: Project): JsonLd[] {
    const url = absoluteUrl(this.i18n.path(`/projects/${project.slug}`));
    const images = [project.cover, ...project.gallery].filter(Boolean).slice(0, 6);
    const work: JsonLd = {
      '@type': 'CreativeWork',
      '@id': `${url}#project`,
      name: this.i18n.pick(project.title),
      description: this.i18n.pick(project.summary),
      url,
      inLanguage: this.i18n.lang(),
      creator: { '@id': ORG_ID },
      mainEntityOfPage: { '@id': `${url}#webpage` },
      image: images.map((img) => absoluteUrl(assetUrl(img))),
    };
    const place = this.i18n.pick(project.location);
    if (place) work['locationCreated'] = { '@type': 'Place', name: place };
    if (project.year) work['dateCreated'] = project.year;
    const genre = this.metaLabel(project);
    if (genre) work['genre'] = this.i18n.pick(genre);
    return [work];
  }

  constructor() {
    this.content.projects().subscribe({
      next: (list) => this.all.set(list),
      error: () => this.all.set([]),
    });

    effect(() => {
      const p = this.project();
      if (p) {
        this.seo.update({
          title: this.pageTitle(p),
          description: this.i18n.pick(p.summary),
          image: assetUrl(p.cover),
          schema: this.schema(p),
        });
      } else if (this.status() === 'notfound') {
        this.seo.update({ title: this.i18n.pick({ en: 'Project not found', ar: 'المشروع غير موجود' }), noindex: true });
      }
    });
  }
}
