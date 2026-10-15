# MSP Service Pages — Architecture and Approval

Date: 2026-10-15 · Status: **built, none published.** Three pages await management approval.

## What exists

| Page | URL (EN / AR) | CMS service it expands | Evidence (projects with this discipline in the CMS today) | Status |
|---|---|---|---|---|
| Architectural Design | `/services/architectural-design` · `/ar/services/architectural-design` | `architecture` (exists) | 5 projects: Madinah Hotel, SBC, Al Munsiyah, residential villas compound, private residence. The other 6 have no disciplines recorded yet. | Draft — not published |
| Interior Design | `/services/interior-design` · `/ar/services/interior-design` | `interior-design` (**not yet in the CMS**, see admin actions §8) | 3 projects: serviced apartments Al Sahafah, Madinah Hotel, Al Munsiyah | Draft — not published |
| Construction Supervision | `/services/construction-supervision` · `/ar/services/construction-supervision` | `supervision` (**not yet in the CMS**) | 1 project: residential villas compound, Riyadh | Draft — not published |

Each page has:

1. A unique H1 and an introduction.
2. What clients need.
3. Scope of service.
4. A four-step method.
5. Relevant project types.
6. Related projects.
7. A contact prompt.
8. Its own title, description, canonical, hreflang, breadcrumb and Service structured data.

The related projects are pulled **from the CMS project records** (the "Disciplines" field). The page cites only work the CMS says MSP did in that discipline. Adding a discipline to a project in the admin adds the project to the page.

## How publication is controlled

All pages are defined in one file: `FrontEnd/src/app/core/data/service-pages.ts`. Each has `approved: false`. While unapproved, a page:

- is not generated at build time, and its URL returns a real 404 in both languages (tested);
- is not in the sitemap;
- is not linked from `/services`.

**To publish a page:**

1. Approve the text below, after the native Arabic review.
2. A developer sets `approved: true` for that page.
3. Rebuild and deploy.

The page is then generated, added to the sitemap and linked from its row on `/services`. Nothing else changes.

## What management needs to approve per page

The **scope, client needs and project types** reuse the text already live-ready on `/services`; it was reviewed in the Arabic editorial pass. The **introduction and the four-step method are new drafts** and need approval. Check each claim is something MSP actually does.

### Architectural Design — draft

- **Intro:** Architectural design that begins with the people who will use a building — shaping plan, massing, daylight and movement so that creative expression and everyday performance are resolved together.
- **Method:**
  1. *Understand* — site, brief, users, applicable regulations.
  2. *Explore* — concept options tested early against structure, services and cost.
  3. *Develop and coordinate* — with structural and MEP engineers, coordinated digitally.
  4. *Document* — drawings and specifications for authority submissions and tender; site follow-up where supervision is appointed.
- **Questions:**
  - Is "coordinated digitally" accurate for typical projects, and is BIM used on all of them or some?
  - Does MSP prepare authority (municipality) submissions itself?

### Interior Design — draft

- **Intro:** Interior design that carries the architectural idea into the rooms people use every day — planned for comfort, durability and maintenance, and coordinated with the building's services.
- **Method:**
  1. *Understand use*.
  2. *Concept and materials*.
  3. *Detailed design* — layouts, lighting, ceilings, joinery, FF&E specifications, coordinated with MEP.
  4. *Follow-through* — procurement-ready documents; sample review and site follow-up where appointed.
- **Questions:**
  - Does MSP specify furniture, fixtures and equipment (FF&E)?
  - Does it review samples during procurement?
  - Should "Interior Design" first be added as a CMS service (admin actions §8)?

### Construction Supervision — draft

- **Intro:** Construction supervision as the client's independent consultant — checking that what is built matches what was designed, approved and specified. MSP supervises the works; it does not carry out construction.
- **Method:**
  1. *Prepare* — review contract documents and approved drawings; agree an inspection and reporting plan.
  2. *Inspect* — site inspections, quality checks, review of shop drawings, material submittals and samples.
  3. *Report* — progress and quality reports; responses to the contractor's technical queries.
  4. *Hand over* — inspection support, outstanding items, documentation.
- **Questions:**
  - Which licence or classification covers MSP's supervision work? The page names none, and it should name one only if management wants it stated.
  - Is supervision offered on projects MSP did not design?
  - Only one project in the CMS records supervision. Are there others whose Disciplines field should include it?

## Not proposed now

Structural, MEP, Urban Planning and Project Management pages are not built. Structural and MEP are recorded in the CMS only as a combined "Engineering Design" discipline, so related projects can't be attributed per discipline yet. Urban Planning has **no** verified planning project. Project Management has no project recording it. They can be added to the same registry once that evidence exists.

## Tests

`FrontEnd/src/app/pages/services/service-detail.spec.ts` checks:

- no page is approved in the shipped registry;
- every registered page has complete content;
- unapproved and unknown slugs show not-found and are noindexed;
- an approved page renders its own title, metadata and Service schema;
- related projects come only from CMS records with the matching discipline.

`app.routes.server.ts` prerenders approved slugs only.
