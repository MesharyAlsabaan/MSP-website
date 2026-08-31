/**
 * Central source of project data, bilingual (EN/AR). Consumed by the home
 * "Selected Works" section, the Works index, and project detail pages.
 * Replace with API calls once the backend exists.
 */

export interface L {
  en: string;
  ar: string;
}

export interface ProjectSpec {
  label: L;
  value: L;
}

export interface Typology {
  key: string;
  en: string;
  ar: string;
}

export interface Project {
  slug: string;
  no: string;
  title: L;
  /** Legacy single category. Kept as the fallback sector for older records. */
  typology: Typology;
  /** Axis 1 — design fields, the works page's top filter row. */
  designCategories?: readonly Typology[];
  /** Axis 2 — sectors, the works page's second filter row. */
  sectors?: readonly Typology[];
  /** Axis 3 — the scope MSP carried. Shown on the project page, not filtered. */
  disciplines?: readonly Typology[];
  location: L;
  year: string;
  cover: string;
  gallery: readonly string[];
  summary: L;
  description: readonly L[];
  specs: readonly ProjectSpec[];
  /** Legacy free-text scope list, superseded by `disciplines`. */
  services: readonly L[];
  /** Highlighted on the home page. */
  featured?: boolean;
}

const T = {
  cultural: { key: 'cultural', en: 'Cultural', ar: 'ثقافي' },
  mixed: { key: 'mixed', en: 'Mixed-use', ar: 'متعدّد الاستخدامات' },
  sports: { key: 'sports', en: 'Sports', ar: 'رياضي' },
  masterplan: { key: 'masterplan', en: 'Masterplan', ar: 'مخطّط شامل' },
  commercial: { key: 'commercial', en: 'Commercial', ar: 'تجاري' },
  civic: { key: 'civic', en: 'Civic', ar: 'مبنى عام' },
} as const;

const SPEC_LABELS = {
  client: { en: 'Client', ar: 'العميل' },
  area: { en: 'Built area', ar: 'المساحة المبنية' },
  status: { en: 'Status', ar: 'الحالة' },
  role: { en: 'Our role', ar: 'دورنا' },
};

const STATUS = {
  completed: { en: 'Completed', ar: 'مكتمل' },
  construction: { en: 'Under construction', ar: 'قيد الإنشاء' },
  design: { en: 'In design', ar: 'قيد التصميم' },
};

const ROLE_FULL = { en: 'Architecture · Structure · MEP', ar: 'عمارة · إنشاءات · كهروميكانيكا' };

export const PROJECTS: readonly Project[] = [
  {
    slug: 'najd-cultural-centre',
    no: '01',
    title: { en: 'Najd Cultural Centre', ar: 'مركز نجد الثقافي' },
    typology: T.cultural,
    location: { en: 'Riyadh', ar: 'الرياض' },
    year: '2025',
    cover: '/images/proj-1.jpg',
    gallery: ['/images/gal-1.jpg', '/images/gal-3.jpg', '/images/proj-7.jpg'],
    featured: true,
    summary: {
      en: 'A civic landmark that gathers galleries, a library, and a performance hall around a shaded courtyard.',
      ar: 'معلمٌ ثقافيٌّ يجمع صالات العرض والمكتبة وقاعة الأداء حول فناءٍ مظلّل.',
    },
    description: [
      {
        en: 'Najd Cultural Centre reinterprets the dense, shaded streets of old Riyadh as a contemporary public building. A deep colonnade wraps a central courtyard, tempering the desert light and giving the city a cool civic room.',
        ar: 'يعيد مركز نجد الثقافي قراءة أزقّة الرياض القديمة المظلّلة في صورة مبنىً عامٍّ معاصر. يلتفّ رواقٌ عميق حول فناءٍ مركزي، يلطّف ضوء الصحراء ويمنح المدينة فضاءً عامّاً ظليلاً.',
      },
      {
        en: 'Our team led the architecture and the full engineering package, coordinating long-span galleries with a naturally ventilated façade to cut cooling loads.',
        ar: 'قاد فريقنا التصميم المعماري وحزمة الهندسة الكاملة، ونسّق صالات العرض ذات البحور الواسعة مع واجهةٍ تُهوّى طبيعياً لخفض أحمال التبريد.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Najd Development Authority', ar: 'هيئة تطوير نجد' } },
      { label: SPEC_LABELS.area, value: { en: '24,000 m²', ar: '٢٤٬٠٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.completed },
      { label: SPEC_LABELS.role, value: ROLE_FULL },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
      { en: 'MEP Engineering', ar: 'الهندسة الكهروميكانيكية' },
    ],
  },
  {
    slug: 'marsa-waterfront-towers',
    no: '02',
    title: { en: 'Marsa Waterfront Towers', ar: 'أبراج مرسى البحرية' },
    typology: T.mixed,
    location: { en: 'Jeddah', ar: 'جدة' },
    year: '2024',
    cover: '/images/proj-2.jpg',
    gallery: ['/images/gal-2.jpg', '/images/gal-4.jpg', '/images/proj-6.jpg'],
    featured: true,
    summary: {
      en: 'Twin mixed-use towers on the Jeddah corniche, pairing residences and offices above a public waterfront podium.',
      ar: 'برجان متعدّدا الاستخدامات على كورنيش جدة، يجمعان السكن والمكاتب فوق قاعدةٍ عامةٍ تطلّ على الواجهة البحرية.',
    },
    description: [
      {
        en: 'Marsa stitches the corniche back to the city with a porous podium of shops and cafés, lifting two slender towers to catch sea breezes and frame the Red Sea horizon.',
        ar: 'تُعيد مرسى وصل الكورنيش بالمدينة عبر قاعدةٍ منفتحةٍ من المتاجر والمقاهي، وترفع برجين رشيقين يلتقطان نسيم البحر ويؤطّران أفق البحر الأحمر.',
      },
      {
        en: 'We engineered the towers for high wind and coastal conditions, with a hybrid concrete core and outriggers that keep floor plates open and column-free at the edges.',
        ar: 'صمّمنا البرجين إنشائياً لمقاومة الرياح العالية والظروف الساحلية، بنواةٍ خرسانيةٍ هجينة ودعاماتٍ خارجية تُبقي الأسقف مفتوحةً وخاليةً من الأعمدة عند الأطراف.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Marsa Holding', ar: 'مرسى القابضة' } },
      { label: SPEC_LABELS.area, value: { en: '78,000 m²', ar: '٧٨٬٠٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.construction },
      { label: SPEC_LABELS.role, value: ROLE_FULL },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
      { en: 'Project Management', ar: 'إدارة المشاريع' },
    ],
  },
  {
    slug: 'qiddiya-sports-pavilion',
    no: '03',
    title: { en: 'Qiddiya Sports Pavilion', ar: 'جناح القدية الرياضي' },
    typology: T.sports,
    location: { en: 'Qiddiya', ar: 'القدية' },
    year: '2024',
    cover: '/images/proj-3.jpg',
    gallery: ['/images/gal-3.jpg', '/images/gal-1.jpg', '/images/proj-5.jpg'],
    featured: true,
    summary: {
      en: 'A long-span training pavilion with a lightweight roof that floats over flexible, daylit courts.',
      ar: 'جناح تدريبٍ بأسقفٍ واسعة البحور وسقفٍ خفيفٍ يطفو فوق ملاعب مرنةٍ تغمرها الإضاءة الطبيعية.',
    },
    description: [
      {
        en: 'The pavilion is conceived as a single great room — a 60-metre clear span sheltered by a folded steel roof that brings in even, north light for play and training.',
        ar: 'صُمِّم الجناح كقاعةٍ واحدةٍ كبرى — بحرٌ صافٍ يمتدّ ستين متراً يحتمي بسقفٍ فولاذيٍّ مطوي يُدخل ضوءاً شمالياً متساوياً للّعب والتدريب.',
      },
      {
        en: 'Our structural team optimised the roof to the lightest viable steel tonnage, cutting embodied carbon while keeping the interior wholly column-free.',
        ar: 'حسّن فريقنا الإنشائي السقف إلى أخفّ وزنٍ فولاذيٍّ ممكن، فخفض الكربون المتضمّن مع إبقاء الداخل خالياً تماماً من الأعمدة.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Qiddiya Investment Company', ar: 'شركة القدية للاستثمار' } },
      { label: SPEC_LABELS.area, value: { en: '12,500 m²', ar: '١٢٬٥٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.completed },
      { label: SPEC_LABELS.role, value: { en: 'Architecture · Structure', ar: 'عمارة · إنشاءات' } },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
    ],
  },
  {
    slug: 'diriyah-residential-quarter',
    no: '04',
    title: { en: 'Diriyah Residential Quarter', ar: 'حيّ الدرعية السكني' },
    typology: T.masterplan,
    location: { en: 'Diriyah', ar: 'الدرعية' },
    year: '2023',
    cover: '/images/proj-4.jpg',
    gallery: ['/images/gal-4.jpg', '/images/gal-2.jpg', '/images/proj-8.jpg'],
    featured: true,
    summary: {
      en: 'A walkable Najdi-inspired neighbourhood masterplan of courtyard homes, shaded alleys, and pocket squares.',
      ar: 'مخطّطٌ سكنيٌّ متمشّى مستوحى من الطراز النجدي، من بيوتٍ بأفنية وأزقّةٍ مظلّلة وميادين صغيرة.',
    },
    description: [
      {
        en: 'The quarter revives the logic of the Najdi town: narrow shaded sikkas, thick thermal-mass walls, and homes turned inward to private courtyards, planned around a five-minute walk to daily needs.',
        ar: 'يُحيي الحيّ منطق البلدة النجدية: سككٌ ضيّقة مظلّلة، وجدرانٌ سميكة عاليةُ الكتلة الحرارية، وبيوتٌ تنفتح على أفنيةٍ خاصة، مخطّطةٌ على مسافة خمس دقائق سيراً للاحتياجات اليومية.',
      },
      {
        en: 'We set the masterplan framework, plot typologies, and public-realm guidelines, then carried three prototype homes through to construction detail.',
        ar: 'وضعنا إطار المخطّط الشامل وأنماط القطع وأدلّة الفضاء العام، ثم أوصلنا ثلاثة نماذج سكنية إلى تفاصيل التنفيذ.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Diriyah Gate Development', ar: 'تطوير بوابة الدرعية' } },
      { label: SPEC_LABELS.area, value: { en: '140,000 m²', ar: '١٤٠٬٠٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.design },
      { label: SPEC_LABELS.role, value: { en: 'Masterplanning · Architecture', ar: 'تخطيط شامل · عمارة' } },
    ],
    services: [
      { en: 'Urban Planning', ar: 'التخطيط العمراني' },
      { en: 'Architecture', ar: 'العمارة' },
    ],
  },
  {
    slug: 'al-faisaliah-office-tower',
    no: '05',
    title: { en: 'Al-Faisaliah Office Tower', ar: 'برج الفيصلية للمكاتب' },
    typology: T.commercial,
    location: { en: 'Riyadh', ar: 'الرياض' },
    year: '2023',
    cover: '/images/proj-5.jpg',
    gallery: ['/images/proj-2.jpg', '/images/gal-1.jpg', '/images/gal-2.jpg'],
    summary: {
      en: 'A grade-A office tower with a high-performance façade and column-free, daylit floor plates.',
      ar: 'برج مكاتب من الفئة (أ) بواجهةٍ عالية الأداء وأسقفٍ خاليةٍ من الأعمدة تغمرها الإضاءة الطبيعية.',
    },
    description: [
      {
        en: 'A taut, fritted-glass skin and recessed shading let the tower run cool through the Riyadh summer, while a side core frees the floors for flexible, panoramic workspaces.',
        ar: 'قشرةٌ زجاجيةٌ مشدودة وتظليلٌ غائر يُبقيان البرج بارداً خلال صيف الرياض، فيما تُحرّر النواةُ الجانبية الأسقف لفضاءات عملٍ مرنةٍ بانورامية.',
      },
      {
        en: 'We delivered the full architecture and MEP design, targeting LEED Gold with high-efficiency systems and smart controls.',
        ar: 'قدّمنا التصميم المعماري والكهروميكانيكي الكامل، مستهدفين شهادة ليد الذهبية بأنظمةٍ عالية الكفاءة وتحكّمٍ ذكي.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Confidential', ar: 'سرّي' } },
      { label: SPEC_LABELS.area, value: { en: '46,000 m²', ar: '٤٦٬٠٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.completed },
      { label: SPEC_LABELS.role, value: { en: 'Architecture · MEP', ar: 'عمارة · كهروميكانيكا' } },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'MEP Engineering', ar: 'الهندسة الكهروميكانيكية' },
    ],
  },
  {
    slug: 'red-sea-visitor-centre',
    no: '06',
    title: { en: 'Red Sea Visitor Centre', ar: 'مركز زوّار البحر الأحمر' },
    typology: T.cultural,
    location: { en: 'Red Sea', ar: 'البحر الأحمر' },
    year: '2025',
    cover: '/images/proj-6.jpg',
    gallery: ['/images/proj-3.jpg', '/images/gal-4.jpg', '/images/gal-3.jpg'],
    summary: {
      en: 'A low-lying coastal pavilion of timber and stone that introduces visitors to a protected reef landscape.',
      ar: 'جناحٌ ساحليٌّ منخفض من الخشب والحجر يُعرّف الزوّار بمحميةٍ شعابيةٍ بحرية.',
    },
    description: [
      {
        en: 'Set lightly on the shore, the centre is a sequence of shaded timber rooms that open to the water, built to tread gently on a sensitive marine ecology.',
        ar: 'يستقرّ المركز بخفّةٍ على الشاطئ، وهو سلسلةٌ من الغرف الخشبية المظلّلة تنفتح على الماء، مبنيٌّ ليُلامس برفقٍ بيئةً بحريةً حسّاسة.',
      },
      {
        en: 'We coordinated a demountable structure and off-grid services so the building can be reduced in footprint — or removed entirely — without scarring the coast.',
        ar: 'نسّقنا هيكلاً قابلاً للفكّ وخدماتٍ مستقلّةً عن الشبكة، بحيث يمكن تقليص أثر المبنى — أو إزالته كلياً — دون أن يترك ندبةً على الساحل.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Red Sea Global', ar: 'البحر الأحمر العالمية' } },
      { label: SPEC_LABELS.area, value: { en: '3,200 m²', ar: '٣٬٢٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.construction },
      { label: SPEC_LABELS.role, value: ROLE_FULL },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
      { en: 'MEP Engineering', ar: 'الهندسة الكهروميكانيكية' },
    ],
  },
  {
    slug: 'king-salman-park-pavilions',
    no: '07',
    title: { en: 'King Salman Park Pavilions', ar: 'أجنحة منتزه الملك سلمان' },
    typology: T.civic,
    location: { en: 'Riyadh', ar: 'الرياض' },
    year: '2024',
    cover: '/images/proj-7.jpg',
    gallery: ['/images/gal-1.jpg', '/images/proj-1.jpg', '/images/gal-2.jpg'],
    summary: {
      en: 'A family of garden pavilions — cafés, shade structures, and a visitor lodge — within the new city park.',
      ar: 'عائلةٌ من أجنحة الحدائق — مقاهٍ ومظلّاتٌ ونُزُلُ زوّار — ضمن منتزه المدينة الجديد.',
    },
    description: [
      {
        en: 'A kit of light, repeatable pavilions gives the park a consistent civic language while adapting to each garden setting, from shaded groves to open lawns.',
        ar: 'مجموعةٌ من الأجنحة الخفيفة القابلة للتكرار تمنح المنتزه لغةً عامةً متّسقة، مع تكيّفها مع كل حديقة، من البساتين المظلّلة إلى المروج المفتوحة.',
      },
      {
        en: 'We standardised the structure and services into a small palette of components, simplifying construction across dozens of locations.',
        ar: 'وحّدنا الهيكل والخدمات في مجموعةٍ صغيرةٍ من العناصر، فبسّطنا التنفيذ عبر عشرات المواقع.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'King Salman Park Foundation', ar: 'مؤسسة منتزه الملك سلمان' } },
      { label: SPEC_LABELS.area, value: { en: '9,800 m²', ar: '٩٬٨٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.construction },
      { label: SPEC_LABELS.role, value: { en: 'Architecture · Structure', ar: 'عمارة · إنشاءات' } },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Structural Engineering', ar: 'الهندسة الإنشائية' },
    ],
  },
  {
    slug: 'olaya-mixed-use-complex',
    no: '08',
    title: { en: 'Olaya Mixed-Use Complex', ar: 'مجمّع العليا متعدّد الاستخدامات' },
    typology: T.mixed,
    location: { en: 'Riyadh', ar: 'الرياض' },
    year: '2022',
    cover: '/images/proj-8.jpg',
    gallery: ['/images/proj-5.jpg', '/images/gal-3.jpg', '/images/proj-2.jpg'],
    summary: {
      en: 'A city block bringing retail, offices, and apartments around a new pedestrian arcade.',
      ar: 'مربّعٌ سكنيٌّ يجمع التجزئة والمكاتب والشقق حول ممرٍّ مشاةٍ جديد.',
    },
    description: [
      {
        en: 'Olaya turns a single large block into a piece of walkable city — a covered arcade slices through the site, lined with shops and lifting offices and homes above.',
        ar: 'يحوّل العليا مربّعاً كبيراً إلى قطعةٍ من مدينةٍ متمشّاة — ممرٌّ مغطّى يخترق الموقع تحفّه المتاجر، وترتفع فوقه المكاتب والمساكن.',
      },
      {
        en: 'We led architecture and project management, phasing construction so the retail arcade could open while the residential floors were completed.',
        ar: 'قُدنا العمارة وإدارة المشروع، وقسّمنا التنفيذ على مراحل ليُفتتح ممرّ التجزئة بينما تكتمل الطوابق السكنية.',
      },
    ],
    specs: [
      { label: SPEC_LABELS.client, value: { en: 'Olaya Real Estate', ar: 'العليا العقارية' } },
      { label: SPEC_LABELS.area, value: { en: '61,000 m²', ar: '٦١٬٠٠٠ م²' } },
      { label: SPEC_LABELS.status, value: STATUS.completed },
      { label: SPEC_LABELS.role, value: { en: 'Architecture · PM', ar: 'عمارة · إدارة مشاريع' } },
    ],
    services: [
      { en: 'Architecture', ar: 'العمارة' },
      { en: 'Project Management', ar: 'إدارة المشاريع' },
    ],
  },
];

export function getProject(slug: string): Project | undefined {
  return PROJECTS.find((p) => p.slug === slug);
}
