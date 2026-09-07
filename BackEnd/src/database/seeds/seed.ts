import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import configuration from '../../config/configuration';
import { Role } from '../../common/enums/role.enum';
import { dataSourceOptions } from '../data-source';
import { BlogPost, BlogStatus } from '../../modules/blog/entities/blog-post.entity';
import { ContactMessage } from '../../modules/contact/entities/contact-message.entity';
import { Partner } from '../../modules/partners/entities/partner.entity';
import { Project, ProjectStatus } from '../../modules/projects/entities/project.entity';
import { Service } from '../../modules/services/entities/service.entity';
import { Setting } from '../../modules/settings/entities/setting.entity';
import { TeamMember } from '../../modules/team/entities/team-member.entity';
import { Testimonial } from '../../modules/testimonials/entities/testimonial.entity';
import { User } from '../../modules/users/entities/user.entity';

const L = (en: string, ar: string) => ({ en, ar });

async function upsert<T>(
  ds: DataSource,
  entity: new () => T,
  where: object,
  data: Partial<T>,
): Promise<void> {
  const repo = ds.getRepository(entity);
  const existing = await repo.findOne({ where: where as any });
  if (existing) {
    await repo.save({ ...existing, ...data });
  } else {
    await repo.save(repo.create(data as any));
  }
}

async function run() {
  const cfg = configuration();
  const ds = new DataSource(dataSourceOptions);
  await ds.initialize();
  console.log('Connected. Seeding…');

  // --- Admin user ---
  const userRepo = ds.getRepository(User);
  const adminEmail = cfg.seed.adminEmail;
  if (!(await userRepo.findOne({ where: { email: adminEmail } }))) {
    await userRepo.save(
      userRepo.create({
        email: adminEmail,
        name: 'MSP Admin',
        role: Role.SuperAdmin,
        active: true,
        passwordHash: await bcrypt.hash(cfg.seed.adminPassword, 10),
      }),
    );
    console.log(`  ✓ admin user ${adminEmail}`);
  }

  // --- Projects ---
  const projects: Partial<Project>[] = [
    {
      slug: 'neom-cultural-pavilion',
      no: '01',
      title: L('NEOM Cultural Pavilion', 'جناح نيوم الثقافي'),
      typology: { key: 'cultural', en: 'Cultural', ar: 'ثقافي' },
      location: L('NEOM, Tabuk', 'نيوم، تبوك'),
      year: '2025',
      cover: 'images/proj-1.jpg',
      gallery: ['images/proj-1.jpg', 'images/proj-2.jpg'],
      summary: L(
        'A civic pavilion framing the desert horizon through layered stone screens.',
        'جناح عام يؤطّر أفق الصحراء عبر مصافٍ حجرية متدرّجة.',
      ),
      description: [
        L('Architecture, structural and MEP design for a 6,000 m² cultural venue.',
          'تصميم معماري وإنشائي وكهروميكانيكي لمنشأة ثقافية بمساحة 6000 م².'),
      ],
      specs: [
        { label: L('Client', 'العميل'), value: L('NEOM', 'نيوم') },
        { label: L('Area', 'المساحة'), value: L('6,000 m²', '6000 م²') },
      ],
      services: [L('Architecture', 'العمارة'), L('Structural', 'الإنشائي')],
      clientName: 'NEOM',
      status: ProjectStatus.Published,
      featured: true,
      sortOrder: 1,
    },
    {
      slug: 'qiddiya-sports-complex',
      no: '02',
      title: L('Qiddiya Sports Complex', 'مجمّع القدية الرياضي'),
      typology: { key: 'sports', en: 'Sports', ar: 'رياضي' },
      location: L('Qiddiya, Riyadh', 'القدية، الرياض'),
      year: '2024',
      cover: 'images/proj-2.jpg',
      gallery: ['images/proj-2.jpg', 'images/proj-3.jpg'],
      summary: L('A multi-venue sports campus with a unifying shaded concourse.',
        'حرم رياضي متعدّد المنشآت برواق مظلّل يوحّد المكوّنات.'),
      description: [L('Full engineering consultancy for stadia and training facilities.',
        'استشارات هندسية متكاملة للملاعب ومرافق التدريب.')],
      specs: [
        { label: L('Client', 'العميل'), value: L('Qiddiya', 'القدية') },
        { label: L('Capacity', 'السعة'), value: L('20,000', '20000') },
      ],
      services: [L('Structural', 'الإنشائي'), L('MEP', 'الكهروميكانيكا')],
      clientName: 'Qiddiya',
      status: ProjectStatus.Published,
      featured: true,
      sortOrder: 2,
    },
    {
      slug: 'riyadh-mixed-use-tower',
      no: '03',
      title: L('Riyadh Mixed-Use Tower', 'برج الرياض متعدّد الاستخدامات'),
      typology: { key: 'mixed', en: 'Mixed-use', ar: 'متعدّد الاستخدامات' },
      location: L('Riyadh', 'الرياض'),
      year: '2024',
      cover: 'images/proj-3.jpg',
      gallery: ['images/proj-3.jpg', 'images/proj-4.jpg'],
      summary: L('Office, retail and residential stacked around a daylit atrium.',
        'مكاتب وتجزئة وسكن حول بهو مضاء بالنهار.'),
      description: [L('Architecture and engineering for a 32-storey tower.',
        'العمارة والهندسة لبرج من 32 طابقًا.')],
      specs: [{ label: L('Floors', 'الطوابق'), value: L('32', '32') }],
      services: [L('Architecture', 'العمارة'), L('MEP', 'الكهروميكانيكا')],
      clientName: 'Private',
      status: ProjectStatus.Published,
      featured: true,
      sortOrder: 3,
    },
    {
      slug: 'diriyah-civic-center',
      no: '04',
      title: L('Diriyah Civic Center', 'مركز الدرعية المدني'),
      typology: { key: 'civic', en: 'Civic', ar: 'مبنى عام' },
      location: L('Diriyah, Riyadh', 'الدرعية، الرياض'),
      year: '2023',
      cover: 'images/proj-4.jpg',
      gallery: ['images/proj-4.jpg', 'images/proj-1.jpg'],
      summary: L('A civic hall in dialogue with Najdi mud-brick heritage.',
        'قاعة مدنية تحاور إرث الطين النجدي.'),
      description: [L('Heritage-sensitive architecture and structural design.',
        'عمارة وتصميم إنشائي يراعيان الإرث.')],
      specs: [{ label: L('Client', 'العميل'), value: L('Diriyah Gate', 'بوابة الدرعية') }],
      services: [L('Architecture', 'العمارة'), L('Urban', 'العمران')],
      clientName: 'Diriyah Gate',
      status: ProjectStatus.Published,
      featured: false,
      sortOrder: 4,
    },
  ];
  for (const p of projects) await upsert(ds, Project, { slug: p.slug }, p);
  console.log(`  ✓ ${projects.length} projects`);

  // --- Services (disciplines) ---
  const services: Partial<Service>[] = [
    { slug: 'architecture', title: L('Architecture', 'العمارة'),
      shortDescription: L('Design from concept to delivery.', 'التصميم من الفكرة إلى التسليم.'),
      fullDescription: L('Full architectural design across all project phases.', 'تصميم معماري متكامل عبر كل مراحل المشروع.'),
      icon: 'compass', featured: true, sortOrder: 1 },
    { slug: 'structural', title: L('Structural Engineering', 'الهندسة الإنشائية'),
      shortDescription: L('Safe, efficient structures.', 'منشآت آمنة وفعّالة.'),
      fullDescription: L('Structural analysis and design for buildings and infrastructure.', 'تحليل وتصميم إنشائي للمباني والبنية التحتية.'),
      icon: 'frame', featured: true, sortOrder: 2 },
    { slug: 'mep', title: L('MEP Engineering', 'الهندسة الكهروميكانيكية'),
      shortDescription: L('Mechanical, electrical, plumbing.', 'الميكانيكا والكهرباء والسباكة.'),
      fullDescription: L('Integrated MEP systems engineered for performance.', 'أنظمة كهروميكانيكية متكاملة مصمّمة للأداء.'),
      icon: 'bolt', featured: true, sortOrder: 3 },
    { slug: 'urban-planning', title: L('Urban Planning', 'التخطيط العمراني'),
      shortDescription: L('Masterplans and districts.', 'المخططات الشاملة والأحياء.'),
      fullDescription: L('Masterplanning for sustainable, liveable districts.', 'تخطيط شامل لأحياء مستدامة وصالحة للعيش.'),
      icon: 'map', featured: true, sortOrder: 4 },
    { slug: 'project-management', title: L('Project Management', 'إدارة المشاريع'),
      shortDescription: L('Delivery, on time.', 'تسليم في الوقت المحدد.'),
      fullDescription: L('End-to-end project and construction management.', 'إدارة شاملة للمشاريع والإنشاء.'),
      icon: 'clipboard', featured: true, sortOrder: 5 },
  ];
  for (const s of services) await upsert(ds, Service, { slug: s.slug }, s);
  console.log(`  ✓ ${services.length} services`);

  // --- Team ---
  const team: Partial<TeamMember>[] = [
    { name: 'Mansour Al-Saleh', title: L('Founder & Principal', 'المؤسس والشريك الرئيسي'),
      bio: L('Leads design vision and practice strategy.', 'يقود الرؤية التصميمية واستراتيجية المكتب.'),
      photo: 'images/team-1.jpg', email: 'mansour@msp.sa', sortOrder: 1 },
    { name: 'Sara Al-Qahtani', title: L('Lead Architect', 'كبيرة المعماريين'),
      bio: L('Heads architectural delivery across studios.', 'تقود التسليم المعماري عبر الاستوديوهات.'),
      photo: 'images/team-2.jpg', sortOrder: 2 },
    { name: 'Omar Khan', title: L('Head of Structures', 'رئيس قسم الإنشاءات'),
      bio: L('Oversees structural engineering.', 'يشرف على الهندسة الإنشائية.'),
      photo: 'images/team-3.jpg', sortOrder: 3 },
    { name: 'Layla Hassan', title: L('MEP Director', 'مديرة الكهروميكانيكا'),
      bio: L('Directs building systems engineering.', 'تدير هندسة أنظمة المباني.'),
      photo: 'images/team-4.jpg', sortOrder: 4 },
  ];
  for (const t of team) await upsert(ds, TeamMember, { name: t.name }, t);
  console.log(`  ✓ ${team.length} team members`);

  // --- Testimonials ---
  const testimonials: Partial<Testimonial>[] = [
    { clientName: 'NEOM', role: L('Development Lead', 'قائد التطوير'),
      quote: L('MSP delivered with precision and care.', 'سلّم فريق MSP بدقّة واهتمام.'),
      rating: 5, sortOrder: 1 },
    { clientName: 'Qiddiya', role: L('Project Director', 'مدير المشروع'),
      quote: L('A trusted engineering partner.', 'شريك هندسي موثوق.'),
      rating: 5, sortOrder: 2 },
  ];
  for (const t of testimonials) await upsert(ds, Testimonial, { clientName: t.clientName }, t);
  console.log(`  ✓ ${testimonials.length} testimonials`);

  // --- Partners ---
  const partners: Partial<Partner>[] = [
    { name: 'NEOM', logo: 'images/partner-neom.png', sortOrder: 1 },
    { name: 'Qiddiya', logo: 'images/partner-qiddiya.png', sortOrder: 2 },
    { name: 'Diriyah Gate', logo: 'images/partner-diriyah.png', sortOrder: 3 },
    { name: 'Red Sea Global', logo: 'images/partner-redsea.png', sortOrder: 4 },
  ];
  for (const p of partners) await upsert(ds, Partner, { name: p.name }, p);
  console.log(`  ✓ ${partners.length} partners`);

  // --- Blog ---
  const posts: Partial<BlogPost>[] = [
    { slug: 'designing-for-the-desert', title: L('Designing for the Desert', 'التصميم للصحراء'),
      category: 'Insights',
      excerpt: L('How climate shapes our architecture.', 'كيف يشكّل المناخ عمارتنا.'),
      body: L('Long-form article body.', 'متن المقال المطوّل.'),
      cover: 'images/proj-1.jpg', author: 'MSP Studio',
      status: BlogStatus.Published, publishedAt: new Date('2026-01-15') as any, sortOrder: 1 },
    {
      slug: 'madinah-hotel-hospitality-rooted-in-place',
      title: L(
        'Madinah Hotel: Hospitality Design Rooted in Place',
        'فندق المدينة المنورة: تصميم ضيافة يستلهم إرث المكان',
      ),
      category: 'Hospitality · ضيافة',
      excerpt: L(
        'How the meaning of welcome in Madinah can shape a contemporary hotel experience—from arrival and privacy to its social and dining spaces.',
        'قراءة في كيفية ترجمة معنى الترحيب المتجذّر في المدينة المنورة إلى تجربة فندقية معاصرة؛ من الوصول والخصوصية إلى الفراغات الاجتماعية والمطعم.',
      ),
      body: L(
        `Madinah holds a place unlike any other. In Islamic memory, the Prophetic migration is inseparable from a defining scene of welcome, shelter, and solidarity. Hospitality here is therefore more than a service standard. It is part of the meaning of the city itself.

For the Madinah Hotel, this context offers a responsibility rather than a decorative theme. The design does not attempt to reproduce history or rely on literal symbols. It seeks to translate enduring values—generosity, calm, dignity, and care—into a contemporary guest experience.

## Hospitality as a sense of place

A hotel in Madinah receives people whose journeys, expectations, and rhythms are varied. Architect Mansour Al-Sabaan and the MSP team approached hospitality as a sequence of considerate moments: a legible arrival, intuitive movement, comfortable thresholds, and spaces that give guests clarity without losing warmth.

The architectural and interior language is intended to feel composed rather than imposing. Proportion, filtered light, tactile materials, and a restrained palette work together to create an atmosphere that supports reflection and rest while remaining contemporary.

## Arrival before the doorway

The guest experience begins before entering the building. The façade, approach, drop-off, entrance, and first view into the lobby should read as one connected transition. Clear orientation reduces effort; shaded thresholds and measured lighting soften the move from the city into the hotel.

Inside, circulation is treated as part of hospitality. Guests should understand where to go without being overwhelmed by signage. Public and private movement are balanced so that service remains efficient while the guest journey feels calm and natural.

## Calm, privacy, and human scale

Privacy is not an added feature in this context; it is a design principle. The relationship between open social areas and quieter zones is carefully graduated. Seating, views, acoustic comfort, and lighting help each space hold its own character while belonging to the same hotel.

This thinking extends to the lobby, rooms, suites, and shared amenities. The aim is consistent: to create spaces that feel generous through comfort and attention, not through excess.

## The restaurant as a social room

The restaurant is one chapter in the wider hotel experience. It brings guests together around food and conversation and acts as a social room within the hospitality journey. Its layout balances open dining, more private seating, lounge moments, and service routes, allowing different patterns of use without fragmenting the space.

Warm materials, layered lighting, framed views, and varied seating settings give the interior rhythm across the day. The visual identity remains connected to the hotel while the restaurant holds a distinct atmosphere of its own.

## Engineering the experience

An effortless guest experience depends on disciplined coordination behind the visible design. Architecture, interiors, mechanical and electrical systems, lighting, acoustics, operations, and back-of-house movement must work as one system. When that coordination succeeds, technology recedes and comfort comes forward.

For MSP, designing hospitality in Madinah means listening to the place before shaping the space. The result is not a historical imitation, but a contemporary expression of welcome—one that respects the city’s cultural weight and turns care into an architectural experience.`,
        `للمدينة المنورة مكانة لا تشبه أي مدينة أخرى. ففي الذاكرة الإسلامية ترتبط الهجرة النبوية بمشهدٍ خالد من الاستقبال والإيواء والتكافل؛ ولذلك لا تكون الضيافة فيها مجرد معيارٍ للخدمة، بل جزءًا من معنى المدينة وهويتها.

في مشروع فندق المدينة المنورة، يمثّل هذا السياق مسؤولية تصميمية لا موضوعًا زخرفيًا. لا يحاول التصميم استنساخ التاريخ أو الاتكاء على رموز مباشرة، وإنما يسعى إلى ترجمة قيمٍ باقية—الكرم والسكينة والخصوصية والعناية—إلى تجربة ضيافة معاصرة.

## الضيافة بوصفها معنى للمكان

يستقبل الفندق في المدينة زوّارًا تتنوع رحلاتهم واحتياجاتهم وإيقاعاتهم. ومن هذا المنطلق تعامل المعماري منصور السبعان وفريق MSP مع الضيافة كسلسلة من اللحظات المدروسة: وصول واضح، وحركة سهلة، وانتقالات مريحة، وفراغات تمنح الضيف الطمأنينة والوضوح من دون أن تفقد دفئها.

تتجه اللغة المعمارية والداخلية إلى الهدوء بدل الاستعراض. وتعمل النِسَب والضوء المصفّى وملمس المواد ولوحة الألوان المتزنة معًا لصناعة أجواء تساعد على التأمل والراحة ضمن تعبير معاصر.

## الوصول يبدأ قبل الباب

تبدأ تجربة الضيف قبل دخول المبنى؛ فالواجهة ومسار الاقتراب ومنطقة النزول والمدخل وأول إطلالة على اللوبي يجب أن تُقرأ كانتقال واحد متصل. يخفف وضوح الاتجاهات من الجهد، بينما تلطف مناطق الظل والإضاءة المتدرجة الانتقال من حركة المدينة إلى سكينة الفندق.

وفي الداخل تصبح الحركة جزءًا من الضيافة. يفهم الضيف طريقه بصورة طبيعية من دون ازدحام بصري أو اعتماد مفرط على اللوحات، مع موازنة حركة الزوار والخدمة لتحافظ العمليات على كفاءتها وتبقى رحلة الضيف هادئة وسلسة.

## السكينة والخصوصية والمقياس الإنساني

الخصوصية هنا ليست إضافة لاحقة، بل مبدأ تصميميًا. لذلك تتدرج العلاقة بين الفراغات الاجتماعية المفتوحة والمناطق الأكثر هدوءًا بعناية. وتساعد الجلسات والإطلالات والمعالجة الصوتية والإضاءة كل فراغ على امتلاك شخصيته، مع بقائه جزءًا من هوية الفندق المتكاملة.

ويمتد هذا التفكير إلى اللوبي والغرف والأجنحة والمرافق المشتركة؛ فالهدف واحد: صناعة إحساس بالرحابة يأتي من الراحة وحسن العناية بالتفاصيل، لا من المبالغة.

## المطعم كغرفة اجتماعية

يمثّل المطعم فصلًا من تجربة الفندق الأوسع، فهو يجمع الضيوف حول الطعام والحوار ويعمل كغرفة اجتماعية داخل رحلة الضيافة. يوازن تخطيطه بين صالة الطعام المفتوحة والجلسات الأكثر خصوصية ومناطق اللاونج ومسارات الخدمة، ليستوعب أنماط استخدام مختلفة من دون تفكيك وحدة الفراغ.

وتمنح المواد الدافئة والإضاءة متعددة الطبقات والإطلالات المؤطرة وتنوّع الجلسات المكان إيقاعًا يتغير خلال اليوم. وتظل هويته البصرية متصلة بالفندق، مع احتفاظ المطعم بأجوائه المميزة.

## الهندسة التي تصنع الراحة

تعتمد التجربة التي تبدو سهلة للضيف على تنسيق دقيق خلف المشهد. فالعمارة والتصميم الداخلي والأنظمة الميكانيكية والكهربائية والإضاءة والصوتيات والتشغيل وحركة الخدمات يجب أن تعمل كمنظومة واحدة. وعندما ينجح هذا التنسيق، تتراجع التقنية إلى الخلف وتتقدم الراحة إلى الواجهة.

بالنسبة إلى MSP، يبدأ تصميم الضيافة في المدينة المنورة بالإنصات إلى المكان قبل تشكيل الفراغ. والنتيجة ليست محاكاة تاريخية، بل تعبيرًا معاصرًا عن حسن الاستقبال؛ يحترم ثقل المدينة الثقافي ويحوّل العناية بالضيف إلى تجربة معمارية متكاملة.`,
      ),
      cover: '',
      gallery: [],
      author: 'MSP Design',
      status: BlogStatus.Published,
      publishedAt: new Date('2026-09-07') as any,
      seoTitle: L(
        'Madinah Hotel Hospitality Design Rooted in Place',
        'تصميم فندق في المدينة المنورة يستلهم إرث الضيافة',
      ),
      seoDescription: L(
        'MSP explores a contemporary hotel in Madinah shaped by welcome, privacy, calm interiors, coordinated engineering, and a distinctive restaurant experience.',
        'يستعرض MSP تصميم فندق في المدينة المنورة يترجم قيم الضيافة والخصوصية والسكينة عبر العمارة والتصميم الداخلي والمطعم والتنسيق الهندسي.',
      ),
      sortOrder: 2,
    },
  ];
  for (const post of posts) await upsert(ds, BlogPost, { slug: post.slug }, post);
  console.log(`  ✓ ${posts.length} blog posts`);

  // --- Settings (company & contact) ---
  const settings: Record<string, unknown> = {
    companyName: L('MSP — Architecture + Engineering', 'MSP — العمارة والهندسة'),
    tagline: L('A Saudi architecture & engineering consultancy.', 'مكتب استشارات معمارية وهندسية سعودي.'),
    phone: '+966 11 000 0000',
    whatsapp: '+966500000000',
    email: 'info@msp.sa',
    addressEn: 'Riyadh, Saudi Arabia',
    addressAr: 'الرياض، المملكة العربية السعودية',
    workingHours: L('Sun–Thu, 9:00–18:00', 'الأحد–الخميس، 9:00–18:00'),
    social: {
      linkedin: 'https://linkedin.com/company/msp',
      instagram: 'https://instagram.com/msp',
      x: 'https://x.com/msp',
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await upsert(ds, Setting, { key }, { key, value } as Partial<Setting>);
  }
  console.log(`  ✓ ${Object.keys(settings).length} settings`);

  // touch ContactMessage repo so the table is verified to exist
  await ds.getRepository(ContactMessage).count();

  await ds.destroy();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
