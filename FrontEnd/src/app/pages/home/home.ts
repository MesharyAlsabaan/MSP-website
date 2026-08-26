import { Component, inject, ChangeDetectionStrategy } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';
import { Hero } from './sections/hero/hero';
import { About } from './sections/about/about';
import { Services } from './sections/services/services';
import { FeaturedProjects } from './sections/featured-projects/featured-projects';
import { Stats } from './sections/stats/stats';
import { WhyUs } from './sections/why-us/why-us';
import { Testimonials } from './sections/testimonials/testimonials';
import { Team } from './sections/team/team';
import { Partners } from './sections/partners/partners';
import { BlogPreview } from './sections/blog-preview/blog-preview';
import { Cta } from './sections/cta/cta';
import { Contact } from './sections/contact/contact';

/**
 * Home page — composes the full 12-section experience defined in the PRD.
 * Public content sections read from the backend and handle empty states without
 * presenting sample projects, partners, or testimonials as real work.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    Hero,
    About,
    Services,
    FeaturedProjects,
    Stats,
    WhyUs,
    Testimonials,
    Team,
    Partners,
    BlogPreview,
    Cta,
    Contact,
  ],
  template: `
    <app-hero />
    <app-about />
    <app-services />
    <app-featured-projects />
    <app-stats />
    <app-why-us />
    <app-testimonials />
    <app-team />
    <app-partners />
    <app-blog-preview />
    <app-cta />
    <app-contact />
  `,
})
export class Home {
  private readonly seo = inject(SeoService);

  constructor() {
    this.seo.update({
      description:
        'MSP Consultants — an architecture & engineering consultancy in Riyadh. Architecture, structural and MEP engineering, urban planning, and project management.',
    });
  }
}
