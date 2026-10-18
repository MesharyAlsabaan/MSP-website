# MSP Website — Placeholder Content: Admin Actions

Date: 2026-10-15 · Status: **prepared, not executed.** Every step below changes production data. Do them only after management approval, signed in to `https://www.msp.sa/admin` as a Content Manager or Super Admin.

Every record and value below was read from the live public API on 2026-10-15 (read-only). Nothing has been changed.

## Order of work

1. Do **steps 1–3 before the next frontend deploy.** The build prerenders whatever is published at that moment, so a placeholder article published at build time becomes a static page and a sitemap entry.
2. Deploy the backend security fix (release-readiness report, P0-1) before or with these steps. Until it ships, the hidden records in step 2 can still be fetched from the public API.

## 1. Unpublish "Designing for the Desert" — P0

The article is seed placeholder text. Its body reads "Long-form article body." and its cover is a stock image. It is published at `/blog/designing-for-the-desert`.

| | |
|---|---|
| Record | Blog post `51d0b42d-5aad-484f-b4d0-d82658051fa8`, slug `designing-for-the-desert` |
| Where | Admin → **Blog** (Journal) → row "Designing for the Desert" → **Edit** |
| Change | Status: `published` → **`draft`** → **Save** |
| Don't | Don't delete it unless you're sure it isn't wanted. Draft is reversible. |
| Check | `https://www.msp.sa/api/blog` lists only the Madinah Hotel article. `/blog` shows one article. |

## 2. Remove fabricated testimonials and partners — P0

These are **seed data**, not real endorsements, and they are in the production database:

- two testimonials attributed to NEOM and Qiddiya
- four "partners": NEOM, Qiddiya, Diriyah Gate and Red Sea Global

They are unpublished or inactive, so the website doesn't display them. But today anyone can read them from the public API (`/api/testimonials?includeDrafts=true`, `/api/partners?includeInactive=true`). The backend fix closes that. Deleting the records removes the risk entirely, including someone publishing them by mistake from the admin.

| Type | Record | Where | Action |
|---|---|---|---|
| Testimonial | NEOM — "MSP delivered with precision and care." `aab74e6a-c609-41a5-a904-e330dbc8be81` | Admin → **Testimonials** | **Delete** → confirm |
| Testimonial | Qiddiya — "A trusted engineering partner." `817065bf-7243-42eb-a000-4a0561b4701c` | Admin → **Testimonials** | **Delete** → confirm |
| Partner | NEOM `e82249b2-940c-4b24-a75f-6327e4301915` | Admin → **Partners** | **Delete** → confirm |
| Partner | Qiddiya `8ceeb94e-d575-46f0-bf26-e7231512cfa1` | Admin → **Partners** | **Delete** → confirm |
| Partner | Diriyah Gate `72f59c20-8967-4155-8e5e-4ff568ff696f` | Admin → **Partners** | **Delete** → confirm |
| Partner | Red Sea Global `7a9b5a6f-591e-4788-bc22-8d2dec2aa8a6` | Admin → **Partners** | **Delete** → confirm |

**Check:** both admin lists are empty. `/api/testimonials?includeDrafts=true` returns `total: 0`.

If any of these organisations *is* a genuine MSP client, don't delete that record. Replace it with a real, written, approved statement and the client's permission to use its name.

**Prevent recurrence:** `BackEnd/src/database/seeds/seed.ts` creates these records. Never run the seed against production. The release-readiness report recommends guarding it (P1-4).

## 3. Hide unverified job vacancies — done in code

The four roles on `/careers` (Senior Architect, Structural Engineer, MEP Engineer, Architectural Intern) are written in the code, not stored in the CMS. On this branch they are **hidden**. The page now invites general applications to `job@msp.sa`.

To publish roles again:

1. Management confirms which roles are open.
2. A developer edits the role list in `FrontEnd/src/app/pages/careers/careers-page.ts`.
3. The developer sets `rolesConfirmed = true` in the same file.
4. Redeploy.

**Confirm:** does the `job@msp.sa` mailbox exist and receive mail? If not, change the address in the same file before deploying.

## 4. Remove placeholder social links — P2

The setting `social` holds `x.com/msp`, `linkedin.com/company/msp` and `instagram.com/msp`, which are generic handles, not verified MSP accounts. The website **doesn't display them** (checked 2026-10-15), but they appear in the public `/api/settings` response.

The admin Settings screen has no field for them, so a Super Admin removes them through the API:

```
DELETE https://www.msp.sa/api/settings/social
Authorization: Bearer <Super Admin access token>
```

Alternatively, once MSP's real profile URLs are confirmed, a Content Manager sends `PUT https://www.msp.sa/api/settings/social` with body `{"value": {"linkedin": "…", "instagram": "…", "x": "…"}}`. A developer can then add them to the footer and to the structured data (`sameAs`).

## 5. Replace the CMS tagline — P1

The CMS tagline "A Saudi architecture & engineering consultancy." overrides the approved footer tagline in the code.

| | |
|---|---|
| Where | Admin → **Settings** → **Tagline** |
| English | `A multidisciplinary architecture and engineering consultancy creating environments that enrich human experience and deliver lasting value.` |
| Arabic | `مكتب استشارات معمارية وهندسية متعدّد التخصصات، يصنع بيئات تُثري التجربة الإنسانية وتحقّق قيمة دائمة.` |
| Then | **Save settings**. Check the footer on `/` and `/ar`. |

## 6. Complete the Riyadh address — P1

| Field (Admin → Settings) | Current | Set to |
|---|---|---|
| Address (English) | Riyadh, Saudi Arabia | `Irqah, Riyadh, Saudi Arabia` |
| Address (Arabic) | الرياض، المملكة العربية السعودية | `حي عرقة، الرياض، المملكة العربية السعودية` |

Add the street and building number too, if management wants them public. Keep them identical to the Google Business Profile.

## 7. Replace promise-style service one-liners — P1

The homepage shows each CMS service's **Short description**. The current lines, such as "Delivery, on time." and "Safe, efficient structures.", read as guarantees. Proposed replacements are factual descriptions of scope. Admin → **Services** → **Edit** each one:

| Service (slug) | Short description (EN) | Short description (AR) |
|---|---|---|
| Architecture (`architecture`) | Architectural design from site study to construction documents. | تصميم معماري من دراسة الموقع حتى المخططات التنفيذية. |
| Structural Engineering (`structural`) | Structural systems analysed and designed alongside the architecture. | أنظمة إنشائية تُحلَّل وتُصمَّم بالتوازي مع التصميم المعماري. |
| MEP Engineering (`mep`) | Mechanical, electrical and plumbing systems designed for comfort and efficient operation. | أنظمة ميكانيكية وكهربائية وصحية تُصمَّم للراحة وكفاءة التشغيل. |
| Urban Planning (`urban-planning`) | Master plans for sites where many buildings must work as one place. | مخططات عامة لمواقع تعمل مبانيها المتعددة كمكان واحد. |
| Project Management (`project-management`) | Independent management of scope, time, cost and quality on the client's behalf. | إدارة مستقلة للنطاق والوقت والتكلفة والجودة نيابةً عن العميل. |

Optional, for consistency with the dedicated service page: rename the **Architecture** service title to "Architectural Design" / «التصميم المعماري». Keep the slug `architecture`; the code relies on it.

## 8. Add the two verified services — approval item A9

Add these only when management approves. The **slug must be exactly as shown**: the website's detailed English and Arabic content is keyed to it.

| Title (EN / AR) | Slug | Short description (EN / AR) |
|---|---|---|
| Interior Design / التصميم الداخلي | `interior-design` | Interiors planned around how spaces are used, coordinated with the building's services. / فراغات داخلية تُخطَّط حول طريقة استخدامها، بالتنسيق مع أنظمة المبنى. |
| Construction Supervision / الإشراف الهندسي | `supervision` | Independent site supervision on the client's behalf, so the works match the approved design. / إشراف ميداني مستقل نيابةً عن العميل، لتطابق الأعمالُ التصميمَ المعتمد. |

Set **Sort order** to place them after Architecture, then **Save**. Leave the Full description short: the site shows the richer built-in content for these slugs.

## 9. Team bios — P2

| Member | Issue | Action |
|---|---|---|
| Abdullah Omar Alhibshi (Branch Director) | Bio is seed text: "Leads architectural delivery across studios." The Arabic verb is feminine («تقود»); check it matches the person. | Replace with an approved bio, or clear both fields. If kept and the masculine form is correct, change the Arabic to «يقود». |
| Mansour Al-Sabaan (Founder & CEO) | One-line bio: "Leads design vision and practice strategy." The English title has a trailing space ("Founder & CEO "). | Optional: a short approved bio; trim the title. |
| Abdullah Alsabaan, Mohammed Alsabaan (Founders) | No bio. | Optional. |

## After all steps

Redeploy the frontend, so the prerendered pages and the sitemap reflect the cleaned content. Then repeat the checks in each section against the live site.
