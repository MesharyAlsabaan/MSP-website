import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { Container } from '../../shared/ui/container/container';
import { Section } from '../../shared/ui/section/section';
import { SectionHeading } from '../../shared/ui/section-heading/section-heading';
import { ScrollReveal } from '../../shared/directives/scroll-reveal.directive';
import { LocPipe } from '../../shared/pipes/loc.pipe';
import { AssetPipe } from '../../shared/pipes/asset.pipe';
import { SrcsetPipe } from '../../shared/pipes/srcset.pipe';
import { Cta } from '../home/sections/cta/cta';
import { TranslationService } from '../../core/services/translation.service';
import { SeoService } from '../../core/services/seo.service';
import { PublicContentService } from '../../core/services/public-content.service';
import { Project } from '../../core/data/projects';
import { SERVICE_DETAILS, SERVICE_PAGES_REGISTRY, ServicePage } from '../../core/data/service-pages';
import { ORG_ID, absoluteUrl } from '../../core/seo/structured-data';

/**
 * A dedicated service page (/services/<slug>). Only pages marked approved in
 * the registry render; any other slug is "not found" and noindexed. Related
 * projects are the published CMS projects carrying the service's discipline.
 */
@Component({
  selector: 'app-service-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, Container, Section, SectionHeading, ScrollReveal, LocPipe, Cta, AssetPipe, SrcsetPipe],
  template: `
    @if (page(); as p) {
      <section class="border-b border-hairline bg-bg pt-16 pb-14 sm:pt-20">
        <app-container>
          <a
            [routerLink]="'/services' | loc"
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

      @if (detail(); as d) {
        <app-section>
          <app-container>
            <div class="grid gap-12 lg:grid-cols-12 lg:gap-8">
              <div class="lg:col-span-6">
                <h2 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.needs) }}</h2>
                <p class="mt-4 text-lg leading-relaxed text-ink/90">{{ i18n.pick(d.needs) }}</p>
                <p class="mt-6 text-lg leading-relaxed text-muted">{{ i18n.pick(d.description) }}</p>
              </div>
              <div class="lg:col-span-5 lg:col-start-8">
                <h2 class="font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.scope) }}</h2>
                <ul class="mt-4 border-t border-hairline">
                  @for (s of d.scope; track s.en) {
                    <li class="border-b border-hairline py-3 text-sm leading-relaxed text-ink">{{ i18n.pick(s) }}</li>
                  }
                </ul>
                <h2 class="mt-10 font-mono text-xs uppercase tracking-[0.18em] text-accent">{{ i18n.pick(t.types) }}</h2>
                <p class="mt-4 text-sm leading-relaxed text-muted">{{ i18n.pick(d.projectTypes) }}</p>
              </div>
            </div>
          </app-container>
        </app-section>
      }

      <app-section tone="surface">
        <app-container>
          <app-section-heading index="—" [eyebrow]="i18n.pick(t.methodEyebrow)" [title]="i18n.pick(t.methodTitle)" />
          <ol class="mt-14 grid gap-px overflow-hidden border border-hairline bg-hairline sm:grid-cols-2 lg:grid-cols-4">
            @for (step of p.method; track step.title.en; let i = $index) {
              <li appScrollReveal [revealDelay]="i * 60" class="bg-bg p-7 lg:p-8">
                <span class="font-mono text-xs text-accent" dir="ltr">{{ '0' + (i + 1) }}</span>
                <h3 class="mt-3 font-display text-xl font-medium text-ink">{{ i18n.pick(step.title) }}</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted">{{ i18n.pick(step.body) }}</p>
              </li>
            }
          </ol>
        </app-container>
      </app-section>

      @if (related().length) {
        <app-section>
          <app-container>
            <app-section-heading index="—" [eyebrow]="i18n.pick(t.projectsEyebrow)" [title]="i18n.pick(p.relatedTitle ?? t.projectsTitle)" />
            <ul class="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              @for (project of related(); track project.slug) {
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
                    <h3 class="mt-4 font-display text-lg font-medium text-ink transition-colors group-hover:text-accent">
                      {{ i18n.pick(project.title) }}
                    </h3>
                    <p class="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-muted">{{ i18n.pick(project.location) }}</p>
                  </a>
                </li>
              }
            </ul>
          </app-container>
        </app-section>
      }

      @if (p.faq.length) {
        <app-section tone="surface">
          <app-container>
            <app-section-heading index="—" [eyebrow]="i18n.pick(t.faqEyebrow)" [title]="i18n.pick(t.faqTitle)" />
            <div class="mt-12 max-w-3xl border-t border-hairline">
              @for (item of p.faq; track item.q.en) {
                <div class="border-b border-hairline py-6">
                  <h3 class="font-display text-lg font-medium text-ink">{{ i18n.pick(item.q) }}</h3>
                  <p class="mt-3 leading-relaxed text-muted">{{ i18n.pick(item.a) }}</p>
                </div>
              }
            </div>
          </app-container>
        </app-section>
      }

      <!-- Consultation: straight to the enquiry form with this service selected. -->
      <section class="border-t border-hairline py-14 sm:py-16">
        <app-container>
          <div class="flex flex-wrap items-center justify-between gap-6">
            <p class="max-w-xl text-lg leading-relaxed text-ink/90">{{ i18n.pick(t.consultText) }}</p>
            <a
              [routerLink]="'/contact' | loc"
              [queryParams]="{ service: p.slug }"
              class="inline-flex items-center justify-center gap-2.5 bg-ink px-6 py-3.5 font-mono text-xs font-medium uppercase tracking-[0.12em] text-bg transition-all duration-300 hover:bg-accent hover:text-accent-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              {{ i18n.pick(t.consultCta) }}
            </a>
          </div>
        </app-container>
      </section>

      <app-cta />
    } @else {
      <section class="flex min-h-[60vh] items-center">
        <app-container>
          <p class="font-mono text-xs uppercase tracking-[0.18em] text-accent">404</p>
          <h1 class="mt-4 font-display text-4xl font-medium text-ink sm:text-5xl">{{ i18n.pick(t.notFound) }}</h1>
          <a
            [routerLink]="'/services' | loc"
            class="mt-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-ink hover:text-accent"
          >
            <span class="dir-flip">&larr;</span> {{ i18n.pick(t.back) }}
          </a>
        </app-container>
      </section>
    }
  `,
})
export class ServiceDetail {
  protected readonly i18n = inject(TranslationService);
  private readonly seo = inject(SeoService);
  private readonly content = inject(PublicContentService);
  private readonly registry = inject(SERVICE_PAGES_REGISTRY);
  private readonly route = inject(ActivatedRoute);

  private readonly slug = toSignal(this.route.paramMap.pipe(map((p) => p.get('slug') ?? '')), {
    initialValue: '',
  });

  /** The page, only if it exists and is approved for publication. */
  protected readonly page = computed<ServicePage | null>(
    () => this.registry.find((p) => p.slug === this.slug() && p.approved) ?? null,
  );
  protected readonly detail = computed(() => {
    const page = this.page();
    return page ? SERVICE_DETAILS[page.cmsSlug] ?? null : null;
  });

  private readonly projects = signal<Project[]>([]);
  /** Published projects whose recorded disciplines include this service. */
  protected readonly related = computed(() => {
    const page = this.page();
    if (!page) return [];
    return this.projects().filter((p) => (p.disciplines ?? []).some((d) => d.key === page.discipline));
  });

  protected readonly t = {
    back: { en: 'All services', ar: 'كل الخدمات' },
    needs: { en: 'What clients need', ar: 'احتياجات العميل' },
    scope: { en: 'Scope of service', ar: 'نطاق الخدمة' },
    types: { en: 'Relevant project types', ar: 'أنواع المشاريع ذات الصلة' },
    methodEyebrow: { en: 'Method', ar: 'المنهجية' },
    methodTitle: { en: 'How we work.', ar: 'كيف نعمل.' },
    projectsEyebrow: { en: 'Projects', ar: 'المشاريع' },
    projectsTitle: { en: 'Related projects.', ar: 'مشاريع ذات صلة.' },
    notFound: { en: 'Service not found.', ar: 'الخدمة غير موجودة.' },
    consultText: {
      en: 'Tell us about your site and brief. We will respond to arrange an initial consultation.',
      ar: 'حدّثنا عن موقعك ومتطلبات مشروعك، وسنتواصل معك لترتيب استشارة أولية.',
    },
    consultCta: { en: 'Request a consultation', ar: 'اطلب استشارة' },
    faqEyebrow: { en: 'Questions', ar: 'أسئلة' },
    faqTitle: { en: 'Frequently asked.', ar: 'أسئلة شائعة.' },
  };

  constructor() {
    this.content.projects().subscribe({ next: (list) => this.projects.set(list), error: () => {} });

    effect(() => {
      const page = this.page();
      if (!page) {
        this.seo.update({ title: this.i18n.pick(this.t.notFound).replace(/\.$/, ''), noindex: true });
        return;
      }
      const url = absoluteUrl(this.i18n.path(`/services/${page.slug}`));
      this.seo.update({
        title: this.i18n.pick(page.seoTitle),
        description: this.i18n.pick(page.seoDescription),
        schema: [
          {
            '@type': 'Service',
            '@id': `${url}#service`,
            name: this.i18n.pick(page.title),
            serviceType: page.title.en,
            description: this.i18n.pick(page.intro),
            provider: { '@id': ORG_ID },
            areaServed: { '@type': 'Country', name: 'Saudi Arabia' },
            url,
          },
          ...(page.faq.length
            ? [
                {
                  '@type': 'FAQPage',
                  '@id': `${url}#faq`,
                  isPartOf: { '@id': `${url}#webpage` },
                  mainEntity: page.faq.map((f) => ({
                    '@type': 'Question',
                    name: this.i18n.pick(f.q),
                    acceptedAnswer: { '@type': 'Answer', text: this.i18n.pick(f.a) },
                  })),
                },
              ]
            : []),
        ],
      });
    });
  }
}
