# MSP Website — Arabic Editorial Review

Date: 2026-10-15 · Branch: `seo-content-transformation` · Scope: every Arabic string added or rewritten in this round (homepage, About, Services, FAQ, Contact, Careers, Team, Projects and Insights intros, header, footer, page metadata, breadcrumbs). Only Arabic values were changed; no English text, layout or logic. All corrections are applied in the branch. This is an expert editorial pass, not a substitute for sign-off by MSP's own native Arabic reviewer (approval item A14).

**Not covered:** the draft text of the three dedicated service pages (`FrontEnd/src/app/core/data/service-pages.ts`), written after this pass. It follows this glossary but needs the same review before those pages are approved. The legal pages were also out of scope; they await counsel.

## 1. Canonical glossary

| English | Canonical Arabic | Notes |
|---|---|---|
| Architecture Beyond Buildings | عمارةٌ تتجاوز المباني | Identical in the hero (split over 3 lines), the /about philosophy title and the footer strap. This is the only place full tashkeel (tanwīn) is kept. |
| architecture & engineering consultancy | مكتب استشارات معمارية وهندسية | SEO titles keep the keyword order «استشارات هندسية ومعمارية». "شركة" was removed (see Q1). |
| MSP (grammatical gender) | feminine: تأسست MSP، تقدّم MSP، مقرّها، لها | When «مكتب» is the head noun, the words that describe it stay masculine, as grammar requires (e.g. footer «مكتب … يصنع»). Sentences that combined MSP with «تأسس» now use «تأسست MSP». |
| architectural / interior design | التصميم المعماري / التصميم الداخلي | |
| structural / MEP engineering | الهندسة الإنشائية / الهندسة الكهروميكانيكية | «(MEP)» kept only where it already appeared (/about, FAQ). |
| urban planning / masterplan | التخطيط العمراني / المخطط العام | |
| project management | إدارة المشاريع | |
| construction supervision | الإشراف الهندسي (service name); الإشراف على التنفيذ (activity) | |
| concept / schematic / detailed design | التصميم المفاهيمي / التصميم الابتدائي / التصميم التفصيلي | «التخطيطي» replaced by «الابتدائي». |
| construction documents | المخططات التنفيذية | |
| shop drawings | مخططات الورشة | No longer confused with construction documents. |
| submittals | طلبات الاعتماد / اعتمادات المواد | |
| calculation reports | المذكرات الحسابية | |
| specifications | المواصفات | |
| authorities | الجهات المختصة (الجهات الحكومية = public-sector clients) | |
| scope / scope of work | نطاق العمل (appointment scope: نطاق التكليف) | |
| brief | المتطلبات (from brief to handover = من المتطلبات الأولى حتى التسليم) | |
| programme (time) | الجدول الزمني | «البرنامج الزمني» removed. |
| design intent | الفكرة التصميمية | «نيّة التصميم» removed. |
| spaces (architectural) | الفراغات | «الفضاءات» removed. Open space = المساحات المفتوحة; public realm = الفراغات العامة. |
| quality assurance / quality control | ضمان الجودة / ضبط الجودة | |
| hospitality | الضيافة (projects in it: مشاريع الضيافة) | «الفندقية» is no longer used for the sector. |
| serviced apartments | شقق فندقية | see Q3 |
| initial conversation | لقاء أولي | |
| Riyadh office / Cairo branch | مكتب الرياض / فرع القاهرة | |
| Technology-enabled, expertise-led | تمكّننا التقنية، وتقودنا الخبرة | |
| About (nav / breadcrumb) | عن المكتب (page eyebrow / SEO: من نحن) | |
| Insights | الرؤى | see Q5 |

Tashkeel policy: word-final case endings and tanwīn were removed. These are kept: tanwīn fatḥ on alif (عاماً، معاً), the ending of indefinite manqūṣ nouns (مبانٍ، باقٍ، جارٍ), shadda, and the internal marks that tell passive from active or one word from another (تُصمَّم، يُنفَّذ، مُراجَعة، ببُعدين، يُورَث، ابنِ معنا).

## 2. Corrections

Every change that alters meaning, terminology, agreement or wording:

| # | File | English meaning | Before | After | Reason |
|---|---|---|---|---|---|
| 1 | `pages/home/home.ts` | SEO description: MSP is an A&E consultancy in Riyadh, est. 2010 … | MSP مكتب استشارات هندسية ومعمارية في الرياض، تأسس عام 2010: تصميم معماري وداخلي، وهندسة إنشائية وكهروميكانيكية، وإشراف هندسي وإدارة مشاريع. | استشارات هندسية ومعمارية في الرياض منذ 2010: تقدّم MSP التصميم المعماري والداخلي، والهندسة الإنشائية والكهروميكانيكية، والإشراف الهندسي وإدارة المشاريع. | RTL / agreement: meta description no longer opens with Latin "MSP" (snippet direction); MSP now takes a feminine verb (تقدّم) |
| 2 | `pages/home/sections/hero/hero.ts` | Hero intro: "…MSP is an A&E consultancy based in Riyadh." | مكتبُ استشاراتٍ معمارية وهندسية مقرُّه الرياض. | مكتب استشارات معمارية وهندسية، مقرّها الرياض. | agreement (pronoun now refers to MSP, feminine) + tashkeel removed |
| 3 | `pages/home/sections/hero/hero.ts` | CTA "Selected works" | ctaSecondary: { en: 'Selected works', ar: 'تصفّح أعمالنا' } | ctaSecondary: { en: 'Selected works', ar: 'مختارات من أعمالنا' } | faithfulness (was "browse our work"); matches projects page title أعمال مختارة |
| 4 | `pages/home/sections/about/about.ts` | Statement: "Architecture is not merely about the spaces we create, but about …" | ليست العمارةُ في الفضاءات التي نُنشئها فحسب، بل في  | لا تقتصر العمارة على الفراغات التي نصمّمها، بل تمتد إلى  | consistency: identical English sentence on /about (philLead) now has identical Arabic; الفضاءات → الفراغات (architectural "spaces") |
| 5 | `pages/home/sections/about/about.ts` | Statement end: "… those spaces make possible." |  التي تُتيحها تلك الفضاءات. |  التي تتيحها تلك الفراغات. | consistency (الفراغات) |
| 6 | `pages/home/sections/about/about.ts` | Para 1: "MSP is a multidisciplinary A&E consultancy, established in Riyadh in 2010. Our practice brings together …" | MSP مكتبُ استشاراتٍ معمارية وهندسية متعدّد التخصصات، تأسّس في الرياض عام 2010. تجمع ممارستُنا خبراتٍ متنوّعة وفكراً إبداعياً وتقنياتٍ متقدّمة في إطارٍ تعاوني، يضع الإنسانَ والأداءَ والأثرَ البعيد المدى في صميم كل مشروع. | تأسّست MSP في الرياض عام 2010، وهي مكتب استشارات معمارية وهندسية متعدد التخصصات. تجمع ممارستنا خبرات متنوعة وفكراً إبداعياً وتقنيات متقدمة في إطار تعاوني يضع الإنسان والأداء والأثر بعيد المدى في صميم كل مشروع. | agreement (تأسّس → تأسّست MSP), RTL (no Latin sentence-opener), tashkeel removed, "الأثر بعيد المدى" aligned with /about |
| 7 | `pages/home/sections/services/services.ts` | Intro: "One consultancy coordinates … so creative intent and technical performance develop together from brief to completion." | ينسّق مكتبٌ استشاريٌّ واحد التصميمَ المعماري والداخلي والهندسةَ والتخطيط وإدارةَ المشاريع والإشراف، ليتطوّر الإبداعُ والأداءُ الفني معاً من المتطلبات الأولى حتى الإنجاز. | ينسّق مكتب استشاري واحد التصميم المعماري والداخلي والهندسة والتخطيط وإدارة المشاريع والإشراف، لتتطور الفكرة الإبداعية والأداء الفني معاً من المتطلبات الأولى حتى الإنجاز. | faithfulness ("creative intent" = الفكرة الإبداعية, not "creativity") + tashkeel removed |
| 8 | `pages/home/sections/services/services.ts` | Architectural Design: "Concept, schematic, and detailed design …" | تصميمٌ مفاهيمي وتخطيطي وتفصيلي، | تصميم مفاهيمي وابتدائي وتفصيلي، | terminology: schematic design = التصميم الابتدائي (Saudi phase name), not التخطيطي |
| 9 | `pages/home/sections/services/services.ts` | Scope: "Concept → Construction documents" | الفكرة ← مخطّطات التنفيذ | الفكرة ← المخططات التنفيذية | terminology: construction documents = المخططات التنفيذية (same as /services) |
| 10 | `pages/home/sections/services/services.ts` | Interior Design: "Interior spaces, finishes, and lighting …" | فضاءاتٌ داخلية وتشطيباتٌ وإضاءة، | فراغات داخلية وتشطيبات وإضاءة، | terminology/consistency: الفراغات (as in scope line and /services) |
| 11 | `pages/home/sections/services/services.ts` | Urban Planning scope: "Masterplanning · Land use" | مخطّط عام · استعمالات الأراضي | المخطط العام · استعمالات الأراضي | terminology: definite المخطط العام, parallel with استعمالات الأراضي |
| 12 | `pages/home/sections/why-us/why-us.ts` | Principle 03 title: "Technology-enabled, expertise-led" | title: 'التقنية تُمكّن، والخبرة تقود' | title: 'تمكّننا التقنية، وتقودنا الخبرة' | consistency with /about techTitle (same English) |
| 13 | `pages/home/sections/cta/cta.ts` | Note: "… to arrange a first conversation." | لترتيب حديثٍ أوّلي. | لترتيب لقاء أولي. | consistency: "initial/first conversation" = لقاء أولي everywhere (contact page, FAQ) |
| 14 | `pages/home/sections/contact/contact.ts` | Heading: "Start a conversation." | headingPre: { en: 'Start a ', ar: 'لنتحدّث عن ' }, ⏎     headingEm: { en: 'conversation.', ar: 'مشروعك.' }, | headingPre: { en: 'Start a ', ar: 'لنبدأ ' }, ⏎     headingEm: { en: 'conversation.', ar: 'الحوار.' }, | faithfulness; also avoids repeating the CTA heading "لنتحدّث عن مشروعك" on the same home page |
| 15 | `pages/home/sections/contact/contact.ts` | Form sent: "Message received" | sentKicker: { en: 'Message received', ar: 'تمّ استلام رسالتك' } | sentKicker: { en: 'Message received', ar: 'استلمنا رسالتك' } | naturalness (avoid the تمّ + verbal-noun calque) |
| 16 | `pages/home/sections/contact/contact.ts` | Placeholder: "Site, scale, ambition…" | الموقع، والنطاق، والطموح… | الموقع، والحجم، والطموح… | meaning: "scale" = الحجم; النطاق means scope |
| 17 | `pages/home/sections/contact/contact.ts` | Button: "Call Riyadh" | ar: 'اتصل بالرياض' | ar: 'اتصل بمكتب الرياض' | naturalness ("call Riyadh" reads as calling the city) |
| 18 | `pages/home/sections/contact/contact.ts` | Label: "Riyadh office" | { label: 'فرع الرياض', | { label: 'مكتب الرياض', | meaning: Riyadh is the head office, not a branch; matches "هاتف مكتب الرياض" |
| 19 | `pages/about/about-page.ts` | Title: "A multidisciplinary architecture and engineering consultancy." | مكتبٌ استشاري متعدد التخصصات في العمارة والهندسة. | مكتب استشارات معمارية وهندسية متعدد التخصصات. | terminology/consistency: canonical "مكتب استشارات معمارية وهندسية" |
| 20 | `pages/about/about-page.ts` | Philosophy: "A museum moves people through spatial drama; … a lively public realm. We integrate …" | فالمتحف يأسر زوّاره بدراما الفراغ، | فالمتحف يأخذ زوّاره في تجربة فراغية مؤثرة، | naturalness ("دراما الفراغ" is a literal calque) |
| 21 | `pages/about/about-page.ts` | Philosophy (cont.): "… a lively public realm. We integrate …" | وحيوية الفضاء العام. ولذلك نُدمج | وحيوية الفراغات العامة. ونحن ندمج | terminology (public realm = الفراغات العامة, as on /services); faithfulness (English has no "therefore") |
| 22 | `pages/about/about-page.ts` | Eyebrow: "Values" | ar: 'قِيَمنا' | ar: 'قيمنا' | tashkeel removed |
| 23 | `pages/about/about-page.ts` | Title: "Technology-enabled. Expertise-led." | ar: 'تُمكّننا التقنية، وتقودنا الخبرة.' | ar: 'تمكّننا التقنية، وتقودنا الخبرة.' | tashkeel; identical wording now used in home "Approach" principle 03 |
| 24 | `pages/about/about-page.ts` | Technology today: "… structured quality assurance …" | وضبط الجودة وفق منهجيةٍ واضحة | وضمان الجودة وفق منهجية واضحة | terminology: quality assurance = ضمان الجودة (ضبط الجودة = quality control) |
| 25 | `pages/about/about-page.ts` | Technology evolving: "AI-assisted workflows … introducing these step by step, and only where they prove their value under expert review." | سير العمل المدعوم بالذكاء الاصطناعي، وأتمتة المهام الهندسية، ودعم القرار المبني على البيانات. ونعتمدها تدريجياً، وحيث تثبت جدواها تحت مراجعة المختصين فقط. | أساليب العمل المدعومة بالذكاء الاصطناعي، وأتمتة المهام الهندسية، ودعم القرار المبني على البيانات. ونُدخلها تدريجياً، ولا نعتمدها إلا حيث تثبت جدواها بمراجعة المختصين. | consistency ("AI-assisted workflows" = أساليب العمل المدعومة… as on home); clearer restriction (إلا … حيث) instead of the trailing فقط |
| 26 | `pages/about/about-page.ts` | SEO title: "About MSP: Architecture & Engineering Consultants" | من نحن: شركة استشارات هندسية ومعمارية | من نحن: مكتب استشارات هندسية ومعمارية | consistency: every other page calls MSP مكتب (see open question 1) |
| 27 | `pages/about/about-page.ts` | SEO description: "Who MSP is: a multidisciplinary A&E consultancy founded in Riyadh in 2010. Our philosophy, vision …" | تعرّف على MSP، مكتب استشارات معمارية وهندسية متعدد التخصصات تأسس في الرياض عام 2010: فلسفتنا ورؤيتنا ورسالتنا وقيمنا وقيادتنا. | تأسست MSP في الرياض عام 2010 مكتباً للاستشارات المعمارية والهندسية متعدد التخصصات. تعرّف على فلسفتنا ورؤيتنا ورسالتنا وقيمنا وقيادتنا. | agreement (تأسس → تأسست MSP) |
| 28 | `pages/services/services-page.ts` | Intro: "… so that design intent, technical performance and cost are resolved together …" | لتُحسم نيّة التصميم | لتُحسم الفكرة التصميمية | terminology: "design intent" = الفكرة التصميمية (نيّة التصميم is a calque) |
| 29 | `pages/services/services-page.ts` | Process intro: "… keep quality, programme and cost in view …" | ونُبقي الجودة والبرنامج الزمني والتكلفة | ونُبقي الجودة والجدول الزمني والتكلفة | consistency: programme = الجدول الزمني (as on home) |
| 30 | `pages/services/services-page.ts` | Architecture scope: "Concept and schematic design" | التصميم المفاهيمي والتخطيطي | التصميم المفاهيمي والابتدائي | terminology: schematic design = التصميم الابتدائي |
| 31 | `pages/services/services-page.ts` | Structural scope: "Structural drawings, details and calculation reports" | ومذكّرات الحسابات | والمذكرات الحسابية | terminology: Saudi usage المذكرات الحسابية |
| 32 | `pages/services/services-page.ts` | MEP scope: "Fire protection and life-safety systems" | أنظمة مكافحة الحريق وسلامة الأرواح | أنظمة الحماية من الحريق وسلامة الأرواح | terminology: protection = الحماية (مكافحة = fire-fighting); matches the MEP description |
| 33 | `pages/services/services-page.ts` | Urban planning scope: "Road hierarchy, access and parking strategy" | تدرّج الطرق | التدرج الهرمي للطرق | terminology |
| 34 | `pages/services/services-page.ts` | PM description: "We plan and track scope, programme, cost and quality …" | نخطّط النطاق والبرنامج الزمني | نخطّط نطاق العمل والجدول الزمني | terminology: scope = نطاق العمل; programme = الجدول الزمني |
| 35 | `pages/services/services-page.ts` | PM scope: "Project planning and programme management" | إدارة البرنامج الزمني | إدارة الجدول الزمني | consistency (الجدول الزمني) |
| 36 | `pages/services/services-page.ts` | Supervision scope: "Site inspections and quality checks" | الزيارات الميدانية وأعمال فحص الجودة | التفتيش الميداني وفحص الجودة | terminology: inspection = التفتيش, not "visits" |
| 37 | `pages/services/services-page.ts` | Supervision scope: "Review of shop drawings, material submittals and samples" | مراجعة المخطّطات التنفيذية للمقاول | مراجعة مخططات الورشة | terminology: shop drawings = مخططات الورشة; المخططات التنفيذية is reserved for construction documents |
| 38 | `pages/services/services-page.ts` | Process 05: "… protecting design intent, quality and programme." | حفاظاً على نيّة التصميم والجودة والبرنامج الزمني. | حفاظاً على الفكرة التصميمية والجودة والجدول الزمني. | terminology/consistency (design intent, programme) |
| 39 | `pages/services/services-page.ts` | SEO title: "Architectural Design & Engineering Services, Riyadh" | ar: 'خدمات التصميم المعماري والاستشارات الهندسية', | ar: 'خدمات التصميم المعماري والاستشارات الهندسية في الرياض', | faithfulness: "Riyadh" was dropped |
| 40 | `pages/services/services-page.ts` | SEO description end: "…: MSP consultancy services in Riyadh." | الخدمات الاستشارية لدى MSP في الرياض. | خدمات MSP الاستشارية في الرياض. | naturalness |
| 41 | `pages/services/services-page.ts` | Urban planning: "… sites where many buildings must work as one place." | تعمل مبانيها المتعدّدة كمكانٍ واحد | تعمل مبانيها المتعدّدة بوصفها مكاناً واحداً | naturalness (كـ + noun is a calque of "as") |
| 42 | `pages/services/services-page.ts` | Process 05: "Where supervision is part of our appointment, we oversee the works …" | حين يشمل التكليفُ الإشرافَ، نتابع | حين يكون الإشراف ضمن نطاق تكليفنا، نتابع | grammar/readability: once case marks are removed, "يشمل التكليف الإشراف" is ambiguous about subject and object; wording now matches FAQ 3 |
| 43 | `pages/faq/faq-page.ts` | FAQ 1: "MSP is an architecture and engineering consultancy." | MSP مكتب استشارات هندسية في العمارة والهندسة. | MSP مكتب استشارات معمارية وهندسية. | redundancy ("هندسية … والهندسة") + canonical term |
| 44 | `pages/faq/faq-page.ts` | FAQ 3: "… reviewing contractor submittals against the approved design …" | ونراجع تقديمات المقاول | ونراجع طلبات اعتماد المقاول | terminology: submittals = طلبات الاعتماد (تقديمات is a calque) |
| 45 | `pages/faq/faq-page.ts` | FAQ 5: "Our services are for those who commission buildings and places: private owners …" | لكل من يطوّر مباني وأماكن، من المُلّاك الأفراد | لكل من يُنشئ المباني والأماكن، من الملّاك الأفراد | meaning ("commission" ≠ يطوّر "develop"); grammar (مباني as indefinite diptote) handled by making it definite; tashkeel |
| 46 | `pages/faq/faq-page.ts` | SEO description: "Answers about working with MSP …" | إجابات حول العمل مع MSP | إجابات عن العمل مع MSP | grammar/style: إجابة عن |
| 47 | `pages/contact/contact-page.ts` | Form sent: "Message received" | sentKicker: { en: 'Message received', ar: 'تمّ استلام رسالتك' } | sentKicker: { en: 'Message received', ar: 'استلمنا رسالتك' } | naturalness (same fix as home contact) |
| 48 | `pages/contact/contact-page.ts` | Default hours: "Sun–Thu · 9:00–17:00" | ar: 'الأحد–الخميس · 9:00–17:00' | ar: 'الأحد – الخميس · من 9:00 إلى 17:00' | RTL: "9:00–17:00" renders as "17:00–9:00" to an LTR eye inside RTL text; من … إلى is unambiguous (fallback only; CMS value overrides) |
| 49 | `pages/contact/contact-page.ts` | Label: "Riyadh office" | label: { en: 'Riyadh office', ar: 'فرع الرياض' } | label: { en: 'Riyadh office', ar: 'مكتب الرياض' } | meaning: head office, not a branch |
| 50 | `pages/careers/careers-page.ts` | Note: "Don’t see your role?" | لم تجد دورك؟ | لم تجد التخصص الذي تبحث عنه؟ | naturalness ("دورك" = your turn/part) |
| 51 | `pages/careers/careers-page.ts` | Role: "MEP Engineer" | ar: 'مهندس كهروميكانيكا' | ar: 'مهندس كهروميكانيكي' | terminology (adjectival job title) |
| 52 | `pages/careers/careers-page.ts` | Role: "Architectural Intern" | ar: 'متدرّب معماري' | ar: 'معماري متدرّب' | naturalness/word order for a job title |
| 53 | `pages/careers/careers-page.ts` | SEO title: "Careers in Architecture & Engineering" | ar: 'الوظائف في العمارة والهندسة' | ar: 'وظائف في العمارة والهندسة' | naturalness (indefinite, as in the English) |
| 54 | `pages/projects/projects.ts` | Intro: "A selection of residential, hospitality and commercial work — … serviced apartments …" | مختاراتٌ من أعمالنا السكنية والفندقية والتجارية، | مختارات من مشاريعنا السكنية والتجارية ومشاريع الضيافة، | consistency: hospitality = الضيافة (not الفندقية); tashkeel |
| 55 | `pages/projects/projects.ts` | SEO description: "Residential, hospitality and commercial projects … a hotel, serviced apartments and office buildings." | مشاريع MSP السكنية والفندقية والتجارية في الرياض والمدينة المنورة: فلل ومجمعات سكنية وفندق وشقق مخدومة ومبانٍ مكتبية. | مشاريع MSP السكنية والتجارية ومشاريع الضيافة في الرياض والمدينة المنورة: فلل ومجمعات سكنية وفندق وشقق فندقية ومبانٍ مكتبية. | consistency: الضيافة; serviced apartments = شقق فندقية (as in FAQ and projects intro; see open question 3) |
| 56 | `pages/blog/blog-page.ts` | Title: "Perspectives on place and practice." | رؤىٌ في المكان والممارسة. | رؤى في المكان والممارسة. | grammar: رؤى is maqṣūr — tanwīn would be رؤًى, never رؤىٌ; tashkeel removed |
| 57 | `pages/blog/blog-page.ts` | SEO description: "… from hospitality design to designing for place in Saudi Arabia." | من تصميم الضيافة إلى التصميم المنتمي إلى المكان في المملكة. | من تصميم منشآت الضيافة إلى التصميم النابع من المكان في المملكة. | naturalness ("تصميم الضيافة" reads as designing hospitality itself) |
| 58 | `layouts/main-layout/components/footer/footer.ts` | Footer: "Established 2010" | ar: 'تأسس عام 2010' | ar: 'تأسست عام 2010' | agreement: implicit subject is MSP (feminine) |
| 59 | `core/services/seo.service.ts` | Breadcrumb: "About" | about: { en: 'About', ar: 'عن MSP' } | about: { en: 'About', ar: 'عن المكتب' } | consistency with the header/footer nav label; removes Latin from breadcrumb |

### Tashkeel and punctuation-only changes (one line per file)

These lines changed only by losing word-final case endings or tanwīn. The wording is the same.

- `pages/home/sections/hero/hero.ts`: hero intro (also covered by row 2).
- `pages/home/sections/about/about.ts`: para 2 (case endings removed, including «تجربتُه / خصوصيتُه»).
- `pages/home/sections/services/services.ts`: title, Structural, MEP, Urban Planning and PM descriptions (5 lines).
- `pages/home/sections/why-us/why-us.ts`: subtitle and principles 01, 02 and 04 («أحدَهما» → «أحدهما»).
- `pages/home/sections/team/team.ts`: title and intro.
- `pages/home/sections/contact/contact.ts`: errEmail («بريدٍ إلكترونيٍّ» → «بريد إلكتروني») and errMessage.
- `pages/about/about-page.ts`: 20 lines (intro, phil2, ceTitle, ceLead, ce1, ce2, techIntro, leadTitle, ambTitle, amb1, amb2, vision, mission, values 02/03/04/06, CEO paragraphs 1–5).
- `pages/services/services-page.ts`: 18 lines (title, needs/description texts, process bodies).
- `pages/faq/faq-page.ts`: title, FAQ 2, 4 and 6–8.
- `pages/contact/contact-page.ts`: intro, sentBody, errEmail, errMessage.
- `pages/careers/careers-page.ts`: intro.
- `pages/team/team-page.ts`: title («الفريقُ») and intro.
- `pages/blog/blog-page.ts`: intro and empty state.
- `layouts/main-layout/components/footer/footer.ts`: tagline.
- No Latin commas or semicolons were found in any Arabic string. All Arabic text already used «،» and «؛».

### Change counts per file

Each count is the number of substantive changes (table rows). The changed-line count in brackets also includes tashkeel-only lines.

| File | Substantive | Lines changed |
|---|---|---|
| pages/home/home.ts | 1 | 1 |
| pages/home/sections/hero/hero.ts | 2 | 2 |
| pages/home/sections/about/about.ts | 3 | 4 |
| pages/home/sections/services/services.ts | 5 | 10 |
| pages/home/sections/why-us/why-us.ts | 1 | 5 |
| pages/home/sections/cta/cta.ts | 1 | 1 |
| pages/home/sections/team/team.ts | 0 | 2 |
| pages/home/sections/contact/contact.ts | 5 | 8 |
| pages/about/about-page.ts | 9 | 29 |
| pages/services/services-page.ts | 15 | 31 |
| pages/faq/faq-page.ts | 4 | 9 |
| pages/contact/contact-page.ts | 3 | 7 |
| pages/careers/careers-page.ts | 4 | 5 |
| pages/team/team-page.ts | 0 | 2 |
| pages/projects/projects.ts | 2 | 3 |
| pages/blog/blog-page.ts | 2 | 4 |
| layouts/main-layout/components/footer/footer.ts | 1 | 2 |
| core/services/seo.service.ts | 1 | 1 |
| stats, blog-preview, partners, project-detail, blog-detail, header, legal (SEO lines) | 0 | 0 |
| **Total** | **59** | **126** |

## 3. Open questions and items for management

1. **«مكتب» or «شركة».** Every page now calls MSP «مكتب استشارات…». The only exception was the /about SEO title, which said «شركة»; it now says «مكتب». If MSP is legally registered as a company and you want «شركة», the change has to be made site-wide, together with the masculine adjectives that describe «مكتب» (e.g. footer «يصنع»).
2. **«MSP» or «إم إس بي للاستشارات».** The legal pages, which were out of scope, write the name as «إم إس بي للاستشارات». Every other page uses the Latin «MSP». Please choose one form. I recommend «MSP» everywhere and the full legal name only in the legal text.
3. **Serviced apartments.** I standardised on «شقق فندقية», the most widely understood term. The Ministry of Tourism's newer classifications also use «الشقق المخدومة». Please confirm which one the project licence or classification uses.
4. **Schematic design = «التصميم الابتدائي».** This is the usual name for the phase in Saudi practice. If your contracts name the phases differently (e.g. «الدراسات الأولية»), please align them.
5. **"Insights" = «الرؤى».** It is grammatical and consistent, but it sits close to «الرؤية» (Vision) on /about. «مقالات» or «آراء ورؤى» would be clearer. This is a branding decision, so I left it unchanged.
6. **CEO role line.** The English reads "Chief Executive Officer, MSP" and the Arabic reads «الرئيس التنفيذي». I left out MSP to avoid «لـ MSP», which mixes Arabic and Latin in RTL. Add it if you want the company name there.
7. **RTL rendering.** `<html dir="rtl">` is set, so in-page sentences that open with «MSP» (hero intro, FAQ 1 and 2) render correctly, and I kept them. I removed «MSP» from the start of the meta descriptions and the breadcrumb, because search snippets may detect direction from the first strong character. Two strings still need a visual check:
   - The stats tile `+` suffix: «16+ عاماً» may show the plus sign on the wrong side of the number, depending on how the template places the suffix.
   - Working hours: I changed the fallback to «من 9:00 إلى 17:00». The value saved in the CMS (`workingHours.ar`) overrides this fallback, and if it still uses «9:00–17:00» it will read as «17:00–9:00» to an LTR eye. Please update the CMS value.
8. **Hero kicker.** "Architecture & Engineering" is rendered as «استشارات معمارية وهندسية», which adds «consultancy». I kept it because it is not a new claim, but a literal alternative is «عمارة وهندسة».
9. **Not reviewed.** These files were outside the listed scope but appear on the home page: `featured-projects.ts` («الأرشيف الكامل» for "Full index") and `testimonials.ts` («آراء عملائنا» for "Words"). Their Arabic looks acceptable. `project-showcase.ts` was not touched, as instructed.
