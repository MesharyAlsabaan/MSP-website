import { InjectionToken } from '@angular/core';

export interface L {
  en: string;
  ar: string;
}

/** What a discipline covers — shown on the services page and on its own page. */
export interface ServiceDetail {
  description: L;
  needs: L;
  scope: readonly L[];
  projectTypes: L;
}

/**
 * What each discipline covers, keyed by CMS service slug. Shown on /services
 * for every published CMS service, and on the dedicated page once approved.
 * Includes interior-design and supervision so they render as soon as those
 * services are added in the CMS.
 */
export const SERVICE_DETAILS: Partial<Record<string, ServiceDetail>> = {
  architecture: {
    description: {
      en: 'Architectural design from the first site study to the drawings a building is constructed from. We shape plan, massing, daylight and movement around the people who will use the building, and coordinate each stage with the engineering disciplines so the design holds together as it develops.',
      ar: 'تصميم معماري يبدأ من دراسة الموقع وينتهي بالمخطّطات التي يُنفَّذ المبنى على أساسها. نصوغ المساقط والكتل والإضاءة الطبيعية والحركة حول الأشخاص الذين سيستخدمون المبنى، وننسّق كل مرحلة مع التخصّصات الهندسية ليبقى التصميم متماسكاً مع تطوّره.',
    },
    needs: {
      en: 'A clear design that fits the site, the brief and the budget, and is ready for authority submissions.',
      ar: 'تصميم واضح يلائم الموقع والمتطلبات والميزانية، وجاهز للتقديم إلى الجهات المختصّة.',
    },
    scope: [
      { en: 'Site analysis and feasibility studies', ar: 'تحليل الموقع ودراسات الجدوى' },
      { en: 'Concept and schematic design', ar: 'التصميم المفاهيمي والابتدائي' },
      { en: 'Design development', ar: 'تطوير التصميم' },
      { en: 'Construction documents and specifications', ar: 'المخطّطات التنفيذية والمواصفات' },
      { en: 'Coordination of authority submissions', ar: 'تنسيق التقديم إلى الجهات المختصّة' },
    ],
    projectTypes: {
      en: 'Residential villas and compounds · Hospitality · Commercial and office · Commercial-residential',
      ar: 'الفلل والمجمّعات السكنية · الضيافة · المباني التجارية والمكتبية · المباني التجارية السكنية',
    },
  },
  'interior-design': {
    description: {
      en: 'Interior design that carries the architectural idea into the spaces people use every day. We plan layouts, materials, lighting and joinery together, so that interiors are comfortable, durable and consistent with the building around them.',
      ar: 'تصميم داخلي يحمل الفكرة المعمارية إلى الفراغات التي يستخدمها الناس كل يوم. نخطّط التوزيع والمواد والإضاءة والأعمال الخشبية معاً، لتكون الفراغات الداخلية مريحة ومتينة ومتّسقة مع المبنى الذي يحتضنها.',
    },
    needs: {
      en: 'Interiors that suit how the space will be used, are coordinated with the building services, and remain practical to maintain.',
      ar: 'فراغات داخلية تلائم طريقة استخدامها، ومنسّقة مع أنظمة المبنى، وعملية في صيانتها.',
    },
    scope: [
      { en: 'Space planning and layouts', ar: 'تخطيط الفراغات والتوزيع الداخلي' },
      { en: 'Interior concept and material palettes', ar: 'المفهوم التصميمي الداخلي ولوحات المواد' },
      { en: 'Lighting, ceiling and joinery design', ar: 'تصميم الإضاءة والأسقف والأعمال الخشبية' },
      { en: 'Furniture, fixtures and finishes specifications', ar: 'مواصفات الأثاث والتجهيزات والتشطيبات' },
      { en: 'Coordination with architectural and MEP design', ar: 'التنسيق مع التصميم المعماري والكهروميكانيكي' },
    ],
    projectTypes: {
      en: 'Residential villas · Hospitality · Commercial and office',
      ar: 'الفلل السكنية · الضيافة · المباني التجارية والمكتبية',
    },
  },
  structural: {
    description: {
      en: 'Structural engineering that gives the architecture a safe, efficient and buildable frame. We select and analyse structural systems early, alongside the design, so that spans, column positions and floor depths support the spaces rather than constrain them. Calculations and drawings are prepared to the applicable Saudi codes.',
      ar: 'هندسة إنشائية تمنح التصميم المعماري هيكلاً آمناً وكفؤاً وقابلاً للتنفيذ. نختار الأنظمة الإنشائية ونحلّلها مبكراً بالتوازي مع التصميم، لتخدم البحور ومواقع الأعمدة وسماكات البلاطات الفراغات بدلاً من أن تقيّدها. وتُعَدّ الحسابات والمخطّطات وفق الأكواد السعودية المعمول بها.',
    },
    needs: {
      en: 'A structure that is safe, economical to build and coordinated with the architecture and building services.',
      ar: 'منشأ آمن، واقتصادي في التنفيذ، ومنسّق مع التصميم المعماري وأنظمة المبنى.',
    },
    scope: [
      { en: 'Structural system options and early-stage advice', ar: 'بدائل الأنظمة الإنشائية والمشورة في المراحل المبكرة' },
      { en: 'Analysis and design of superstructure and foundations', ar: 'تحليل الهيكل العلوي والأساسات وتصميمها' },
      { en: 'Structural drawings, details and calculation reports', ar: 'المخطّطات والتفاصيل الإنشائية والمذكرات الحسابية' },
      { en: 'Coordination with architectural and MEP models', ar: 'التنسيق مع النماذج المعمارية والكهروميكانيكية' },
      { en: 'Technical support during construction, where included in the appointment', ar: 'الدعم الفني أثناء التنفيذ متى شمله نطاق التكليف' },
    ],
    projectTypes: {
      en: 'Residential villas and compounds · Hospitality · Commercial and office · Commercial-residential',
      ar: 'الفلل والمجمّعات السكنية · الضيافة · المباني التجارية والمكتبية · المباني التجارية السكنية',
    },
  },
  mep: {
    description: {
      en: 'Mechanical, electrical and plumbing engineering that makes a building comfortable, safe and efficient to run. We design the systems people rely on without seeing — cooling, ventilation, power, lighting, water and fire safety — and coordinate their routes with the structure and architecture from the outset.',
      ar: 'هندسة كهروميكانيكية تجعل المبنى مريحاً وآمناً وكفؤاً في تشغيله. نصمّم الأنظمة التي يعتمد عليها المستخدمون دون أن يروها، من التكييف والتهوية إلى الطاقة الكهربائية والإنارة والمياه والحماية من الحريق، وننسّق مساراتها مع الهيكل الإنشائي والتصميم المعماري منذ البداية.',
    },
    needs: {
      en: 'Thermal comfort, reliable services, and running costs that stay manageable over the life of the building.',
      ar: 'راحة حرارية، وأنظمة يُعتمد عليها، وتكاليف تشغيل تبقى تحت السيطرة طوال عمر المبنى.',
    },
    scope: [
      { en: 'HVAC and ventilation design', ar: 'تصميم أنظمة التكييف والتهوية' },
      { en: 'Electrical power, lighting and low-current systems', ar: 'القوى الكهربائية والإنارة وأنظمة التيار الخفيف' },
      { en: 'Water supply, plumbing and drainage', ar: 'التغذية بالمياه والتمديدات الصحية والصرف' },
      { en: 'Fire protection and life-safety systems', ar: 'أنظمة الحماية من الحريق وسلامة الأرواح' },
      { en: 'Multidisciplinary coordination of services routes', ar: 'التنسيق متعدّد التخصّصات لمسارات الأنظمة' },
    ],
    projectTypes: {
      en: 'Residential villas and compounds · Hospitality · Commercial and office · Commercial-residential',
      ar: 'الفلل والمجمّعات السكنية · الضيافة · المباني التجارية والمكتبية · المباني التجارية السكنية',
    },
  },
  'urban-planning': {
    description: {
      en: 'Urban planning and master planning for sites where many buildings must work as one place. We organise land use, movement, open space and infrastructure so that a development is coherent, comfortable to walk and able to grow in phases.',
      ar: 'تخطيط عمراني ومخطّطات عامة للمواقع التي يجب أن تعمل مبانيها المتعدّدة بوصفها مكاناً واحداً. ننظّم استعمالات الأراضي والحركة والمساحات المفتوحة والبنية التحتية، ليكون المشروع مترابطاً، ومريحاً للمشاة، وقابلاً للتطوير على مراحل.',
    },
    needs: {
      en: 'A clear framework for a multi-building site that balances density, amenity and phased delivery.',
      ar: 'إطار واضح لموقع متعدّد المباني يوازن بين الكثافة والمرافق والتنفيذ المرحلي.',
    },
    scope: [
      { en: 'Site analysis and planning studies', ar: 'تحليل الموقع والدراسات التخطيطية' },
      { en: 'Master plans and land-use distribution', ar: 'المخطّطات العامة وتوزيع استعمالات الأراضي' },
      { en: 'Road hierarchy, access and parking strategy', ar: 'التدرج الهرمي للطرق واستراتيجية الوصول ومواقف السيارات' },
      { en: 'Open space and public realm planning', ar: 'تخطيط المساحات المفتوحة والفراغات العامة' },
      { en: 'Phasing and infrastructure coordination', ar: 'مرحلية التنفيذ وتنسيق البنية التحتية' },
    ],
    projectTypes: {
      en: 'Residential compounds and communities · Commercial-residential developments',
      ar: 'المجمّعات والمجتمعات السكنية · المشاريع التجارية السكنية',
    },
  },
  'project-management': {
    description: {
      en: 'Project management on the client’s behalf, from appointing the design team through to completion. We plan and track scope, programme, cost and quality, coordinate consultants and stakeholders, and give the client independent, timely information for decisions. As consultants, we represent the client’s interests; we do not carry out construction.',
      ar: 'إدارة المشاريع نيابة عن العميل، من تعيين فريق التصميم حتى الإنجاز. نخطّط نطاق العمل والجدول الزمني والتكلفة والجودة ونتابعها، وننسّق بين الاستشاريين والأطراف المعنية، ونزوّد العميل بمعلومات مستقلة وفي وقتها لاتخاذ القرار. وبصفتنا استشاريين نمثّل مصالح العميل، ولا نتولّى أعمال التنفيذ.',
    },
    needs: {
      en: 'Clear control of time, cost and quality, with one accountable point of coordination.',
      ar: 'ضبط واضح للوقت والتكلفة والجودة، مع جهة تنسيق واحدة مسؤولة.',
    },
    scope: [
      { en: 'Project planning and programme management', ar: 'تخطيط المشروع وإدارة الجدول الزمني' },
      { en: 'Cost monitoring and reporting', ar: 'متابعة التكاليف وإعداد التقارير' },
      { en: 'Design management and consultant coordination', ar: 'إدارة التصميم وتنسيق أعمال الاستشاريين' },
      { en: 'Procurement and tender support', ar: 'دعم إجراءات الطرح والترسية' },
      { en: 'Risk, change and progress reporting', ar: 'تقارير المخاطر والتغييرات ونسب الإنجاز' },
    ],
    projectTypes: {
      en: 'Residential villas and compounds · Hospitality · Commercial and office · Commercial-residential',
      ar: 'الفلل والمجمّعات السكنية · الضيافة · المباني التجارية والمكتبية · المباني التجارية السكنية',
    },
  },
  supervision: {
    description: {
      en: 'Construction supervision as the client’s consultant. We monitor the works on site against the approved drawings, specifications and codes, so that what is built reflects what was designed. Supervision is a consultancy service: we oversee and report on the contractor’s work on the client’s behalf; we do not carry out construction.',
      ar: 'إشراف هندسي على التنفيذ بصفتنا استشاري العميل. نتابع الأعمال في الموقع مقارنة بالمخطّطات والمواصفات المعتمدة والأكواد، ليأتي ما يُنفَّذ مطابقاً لما صُمِّم. والإشراف خدمة استشارية؛ نراقب أعمال المقاول ونرفع التقارير عنها نيابة عن العميل، ولا نتولّى التنفيذ.',
    },
    needs: {
      en: 'Independent assurance that the works match the approved design, quality and specifications.',
      ar: 'تحقّق مستقل من مطابقة الأعمال للتصميم المعتمد ومتطلبات الجودة والمواصفات.',
    },
    scope: [
      { en: 'Site inspections and quality checks', ar: 'التفتيش الميداني وفحص الجودة' },
      { en: 'Review of shop drawings, material submittals and samples', ar: 'مراجعة مخططات الورشة واعتمادات المواد والعيّنات' },
      { en: 'Responses to technical queries', ar: 'الردّ على الاستفسارات الفنية' },
      { en: 'Progress monitoring and reporting to the client', ar: 'متابعة سير الأعمال ورفع التقارير إلى العميل' },
      { en: 'Inspection support at handover', ar: 'دعم أعمال الفحص والاستلام عند التسليم' },
    ],
    projectTypes: {
      en: 'Residential villas and compounds · Hospitality · Commercial and office · Commercial-residential',
      ar: 'الفلل والمجمّعات السكنية · الضيافة · المباني التجارية والمكتبية · المباني التجارية السكنية',
    },
  },
};

/** A dedicated service page at /services/<slug> (and /ar/services/<slug>). */
export interface ServicePage {
  /** URL slug, e.g. `architectural-design`. */
  slug: string;
  /** The CMS service it expands on (and the key into SERVICE_DETAILS). */
  cmsSlug: string;
  /**
   * Project discipline key (core/data/taxonomy DISCIPLINES). Related projects
   * are the published CMS projects carrying it — evidence comes from the
   * portfolio records, never from this file.
   */
  discipline: string;
  /**
   * Publication gate. An unapproved page is not prerendered, not in the
   * sitemap, not linked, and its URL is a 404. Flip only after management has
   * approved the page text (see docs/content/MSP-SERVICE-PAGES.md).
   */
  approved: boolean;
  title: L;
  seoTitle: L;
  seoDescription: L;
  intro: L;
  /** How MSP delivers this service — DRAFT until approved. */
  method: readonly { title: L; body: L }[];
}

export const SERVICE_PAGES: readonly ServicePage[] = [
  {
    slug: 'architectural-design',
    cmsSlug: 'architecture',
    discipline: 'architectural-design',
    approved: false,
    title: { en: 'Architectural Design', ar: 'التصميم المعماري' },
    seoTitle: { en: 'Architectural Design Services in Riyadh', ar: 'خدمات التصميم المعماري في الرياض' },
    seoDescription: {
      en: 'Architectural design by MSP in Riyadh: from site study and concept to construction documents, coordinated with structural and MEP engineering.',
      ar: 'التصميم المعماري لدى MSP في الرياض: من دراسة الموقع والفكرة التصميمية إلى المخططات التنفيذية، بالتنسيق مع الهندسة الإنشائية والكهروميكانيكية.',
    },
    intro: {
      en: 'Architectural design that begins with the people who will use a building — shaping plan, massing, daylight and movement so that creative expression and everyday performance are resolved together.',
      ar: 'تصميم معماري ينطلق من الأشخاص الذين سيستخدمون المبنى، فيصوغ المساقط والكتل والإضاءة الطبيعية والحركة، ليجتمع التعبير الإبداعي والأداء اليومي في حلٍّ واحد.',
    },
    method: [
      {
        title: { en: 'Understand', ar: 'الفهم' },
        body: {
          en: 'We study the site, the brief and the people the building will serve, and test the brief against the applicable regulations before design begins.',
          ar: 'ندرس الموقع ومتطلبات المشروع والأشخاص الذين سيخدمهم المبنى، ونراجع المتطلبات في ضوء الأنظمة المعمول بها قبل البدء في التصميم.',
        },
      },
      {
        title: { en: 'Explore', ar: 'الاستكشاف' },
        body: {
          en: 'Concept options are developed and tested early against structure, building services and cost, so the chosen idea is one that can be built.',
          ar: 'نطوّر بدائل للفكرة التصميمية ونختبرها مبكراً في ضوء متطلبات الإنشاء وأنظمة المبنى والتكلفة، ليكون الخيار المعتمد قابلاً للتنفيذ.',
        },
      },
      {
        title: { en: 'Develop and coordinate', ar: 'التطوير والتنسيق' },
        body: {
          en: 'The design is developed with the structural and MEP engineers and coordinated digitally, so that decisions hold up on site.',
          ar: 'نطوّر التصميم مع المهندسين الإنشائيين ومهندسي الأنظمة الكهروميكانيكية وننسّقه رقمياً، لتصمد القرارات عند التنفيذ.',
        },
      },
      {
        title: { en: 'Document', ar: 'التوثيق' },
        body: {
          en: 'Drawings and specifications are prepared for authority submissions and tender, and followed through on site where supervision is part of the appointment.',
          ar: 'نعدّ المخططات والمواصفات للتقديم إلى الجهات المختصة وللطرح، ونتابعها في الموقع متى شمل التكليفُ الإشراف.',
        },
      },
    ],
  },
  {
    slug: 'interior-design',
    cmsSlug: 'interior-design',
    discipline: 'interior-design',
    approved: false,
    title: { en: 'Interior Design', ar: 'التصميم الداخلي' },
    seoTitle: { en: 'Interior Design Consultancy in Riyadh', ar: 'استشارات التصميم الداخلي في الرياض' },
    seoDescription: {
      en: 'Interior design by MSP: layouts, materials, lighting and joinery for residential, hospitality and workplace interiors, coordinated with building services.',
      ar: 'التصميم الداخلي لدى MSP: تخطيط الفراغات والمواد والإضاءة والأعمال الخشبية للمساكن ومنشآت الضيافة وبيئات العمل، بالتنسيق مع أنظمة المبنى.',
    },
    intro: {
      en: 'Interior design that carries the architectural idea into the rooms people use every day — planned for comfort, durability and maintenance, and coordinated with the building’s services.',
      ar: 'تصميم داخلي يحمل الفكرة المعمارية إلى الفراغات التي يستخدمها الناس كل يوم، ويُخطَّط للراحة والمتانة وسهولة الصيانة، بالتنسيق مع أنظمة المبنى.',
    },
    method: [
      {
        title: { en: 'Understand use', ar: 'فهم الاستخدام' },
        body: {
          en: 'We start from how each space will be used — by residents, guests or staff — and from the operational and maintenance needs of the owner.',
          ar: 'نبدأ من طريقة استخدام كل فراغ، سواء من السكان أو النزلاء أو فرق العمل، ومن احتياجات المالك في التشغيل والصيانة.',
        },
      },
      {
        title: { en: 'Concept and materials', ar: 'المفهوم والمواد' },
        body: {
          en: 'An interior concept and material palette consistent with the architecture, tested for durability, cost and the local climate.',
          ar: 'مفهوم تصميمي داخلي ولوحة مواد متّسقان مع العمارة، تُختبر من حيث المتانة والتكلفة وملاءمة المناخ المحلي.',
        },
      },
      {
        title: { en: 'Detailed design', ar: 'التصميم التفصيلي' },
        body: {
          en: 'Layouts, lighting, ceilings and joinery designed together and coordinated with the MEP design, with specifications for furniture, fixtures and finishes.',
          ar: 'نصمّم التوزيع والإضاءة والأسقف والأعمال الخشبية معاً وننسّقها مع التصميم الكهروميكانيكي، مع مواصفات الأثاث والتجهيزات والتشطيبات.',
        },
      },
      {
        title: { en: 'Follow-through', ar: 'المتابعة' },
        body: {
          en: 'Drawings and specifications ready for procurement, with review of samples and site follow-up where included in the appointment.',
          ar: 'مخططات ومواصفات جاهزة للتوريد، مع مراجعة العيّنات والمتابعة في الموقع متى شملها نطاق التكليف.',
        },
      },
    ],
  },
  {
    slug: 'construction-supervision',
    cmsSlug: 'supervision',
    discipline: 'supervision',
    approved: false,
    title: { en: 'Construction Supervision', ar: 'الإشراف الهندسي' },
    seoTitle: { en: 'Construction Supervision Consultancy in Riyadh', ar: 'استشارات الإشراف الهندسي على التنفيذ في الرياض' },
    seoDescription: {
      en: 'Construction supervision by MSP as the client’s consultant: site inspections, submittal review and reporting, so that what is built matches the approved design.',
      ar: 'الإشراف الهندسي لدى MSP بصفتها استشاري العميل: زيارات ميدانية، ومراجعة الاعتمادات، وتقارير دورية، ليطابق المنفَّذُ التصميمَ المعتمد.',
    },
    intro: {
      en: 'Construction supervision as the client’s independent consultant — checking that what is built matches what was designed, approved and specified. MSP supervises the works; it does not carry out construction.',
      ar: 'إشراف هندسي على التنفيذ بصفتنا استشارياً مستقلاً للعميل، نتحقق فيه من مطابقة ما يُنفَّذ لما صُمّم واعتُمد ووُصّف. تتولى MSP الإشراف على الأعمال، ولا تتولى تنفيذها.',
    },
    method: [
      {
        title: { en: 'Prepare', ar: 'التحضير' },
        body: {
          en: 'We review the contract documents and approved drawings and agree an inspection and reporting plan with the client.',
          ar: 'نراجع مستندات العقد والمخططات المعتمدة، ونتفق مع العميل على خطة للفحص ورفع التقارير.',
        },
      },
      {
        title: { en: 'Inspect', ar: 'الفحص' },
        body: {
          en: 'Site inspections and quality checks, with review of shop drawings, material submittals and samples against the specifications.',
          ar: 'زيارات ميدانية وأعمال فحص الجودة، مع مراجعة مخططات الورشة واعتمادات المواد والعيّنات مقارنةً بالمواصفات.',
        },
      },
      {
        title: { en: 'Report', ar: 'التقارير' },
        body: {
          en: 'Clear progress and quality reporting to the client, and timely responses to the contractor’s technical queries.',
          ar: 'تقارير واضحة للعميل عن سير الأعمال وجودتها، وردود في وقتها على الاستفسارات الفنية للمقاول.',
        },
      },
      {
        title: { en: 'Hand over', ar: 'الاستلام' },
        body: {
          en: 'Inspection support at handover, with the outstanding items and documentation the owner needs to operate the building.',
          ar: 'دعم أعمال الفحص عند الاستلام، مع حصر الملاحظات المتبقية والمستندات التي يحتاجها المالك لتشغيل المبنى.',
        },
      },
    ],
  },
];

/** The registry the page reads (a token, so tests can supply approved pages). */
export const SERVICE_PAGES_REGISTRY = new InjectionToken<readonly ServicePage[]>('SERVICE_PAGES', {
  providedIn: 'root',
  factory: () => SERVICE_PAGES,
});

/** Slugs of pages cleared for publication (prerendered and linked). */
export const APPROVED_SERVICE_SLUGS: readonly string[] = SERVICE_PAGES.filter((p) => p.approved).map((p) => p.slug);
