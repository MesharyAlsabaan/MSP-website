# إعداد القياس وطلبات العملاء — موقع MSP

التاريخ: 2026-10-18 · المصدر: GitHub `main` · الحالة: الشيفرة جاهزة. الخطوات أدناه تحتاج حسابات أو قرارات خارجية، وكل خطوة معلَّم عليها من ينفّذها.

## 0. ما هو جاهز في الموقع الآن

| الميزة | الحالة | تعمل عند |
|---|---|---|
| تتبّع التحويلات (`generate_lead`, `phone_click`, `email_click`, `whatsapp_click`) | مبني ومختبر | إضافة معرّف GA4 **و** موافقة الزائر |
| شريط الموافقة على التحليلات + رابط «خيار التحليلات» في التذييل | مبني، لا يظهر حالياً | إضافة معرّف GA4 |
| إشعار بريدي بكل طلب جديد | مبني ومختبر، متوقف | ضبط متغيرات SMTP في Railway |
| خريطة الموقع | `https://www.msp.sa/sitemap.xml` (56 رابطاً) | الآن |

لا يُحمَّل أي سكربت تحليلات ولا يُرسَل أي بريد قبل الخطوات أدناه.

---

## 1. Google Search Console — **من ينفّذ: صاحب حساب Google + من يدير Cloudflare**

قيمة التحقق تُنشأ داخل حساب Google لكل حساب، لذا لا يمكن معرفتها مسبقاً. صيغة السجل المطلوب:

| الحقل في Cloudflare | القيمة |
|---|---|
| Type | `TXT` |
| Name | `@` (أي `msp.sa`) |
| Content | `google-site-verification=…` (تُنسخ كما هي من Search Console) |
| TTL | Auto |
| Proxy | لا ينطبق على TXT |

**لا تعدّل أي سجل آخر.** السجلات الحالية (`hosted-email-verify` وSPF وDMARC وMX) تبقى كما هي، ويُضاف سجل TXT جديد بجانبها.

الخطوات:
1. افتح https://search.google.com/search-console ثم **Add property** ثم **Domain** واكتب `msp.sa`.
2. انسخ قيمة TXT، وأضف السجل في Cloudflare: **DNS → Records → Add record**.
3. ارجع إلى Search Console واضغط **Verify**. التحقق قد يتأخر دقائق.
4. **Sitemaps:** أرسل `https://www.msp.sa/sitemap.xml`.
5. **URL Inspection → Request indexing** للرئيسية، و`/services`، وصفحات الخدمات الخمس:
   - `/services/architectural-design`
   - `/services/interior-design`
   - `/services/structural-engineering`
   - `/services/mep-engineering`
   - `/services/construction-supervision`
6. **Settings → Users and permissions:** أضف مستخدماً بصلاحية **Full** لمن سيعدّ التقارير.

**خط الأساس:** بعد التحقق مباشرة يعرض تقرير **Performance** آخر 16 شهراً. صدّر النقرات والظهور ونسبة النقر ومتوسط الترتيب (Date range: Last 16 months → Export)، واحفظ الملف بتاريخ اليوم. هذا هو خط الأساس.

---

## 2. Google Analytics 4 — **من ينفّذ: صاحب حساب Google، بعد اعتماد البند 4**

1. افتح https://analytics.google.com ثم **Admin → Create → Property**:
   - الاسم: `MSP Website`
   - المنطقة الزمنية: Saudi Arabia (Riyadh)
   - العملة: SAR
2. أنشئ **Data stream → Web** بعنوان `https://www.msp.sa`، وانسخ **Measurement ID** (بالصيغة `G-XXXXXXX`).
3. **Data settings:**
   - **Data retention:** 14 months.
   - **Data collection:** Google signals = **Off**.
4. **Enhanced measurement:** اترك Page views. أوقف **Form interactions** لأن الموقع يرسل حدث إرسال النموذج بنفسه، فلا يُحتسب مرتين.
5. **Admin → Events → Create** (أو بعد ظهورها أول مرة): علّم الأحداث الأربعة **Key events**:
   - `generate_lead`
   - `phone_click`
   - `email_click`
   - `whatsapp_click`
6. **Custom definitions → Create custom dimension** (Event scope):
   - `form` (قيمها `contact_page` و`home`)
   - `service` (الخدمة المختارة في النموذج)
7. **Product links → Search Console:** اربط الخاصية بـ Search Console.
8. **أرسل المعرّف للمطوّر.** التفعيل سطر واحد في `FrontEnd/src/environments/environment.prod.ts`:
   `ga4MeasurementId: 'G-XXXXXXX'`، ثم commit إلى `main` ونشر تلقائي.
9. **التحقق بعد التفعيل:** افتح الموقع، اضغط «موافق» في الشريط، ثم انقر رابط هاتف. يجب أن يظهر `phone_click` في **Admin → DebugView** أو **Realtime**.

**ما يُرسَل إلى Google فقط:**
- اسم الحدث
- مسار الصفحة
- `form` و`service`

لا يُرسَل الاسم ولا البريد ولا الجوال ولا نص الرسالة. والإشارات الإعلانية متوقفة في الشيفرة.

---

## 3. إشعار بريدي بكل طلب — **من ينفّذ: من يدير Migadu وRailway**

**في Migadu:**
- أنشئ صندوقاً للإرسال، مثلاً `website@msp.sa`، كصندوق كامل وليس alias.
- فعّل **May send = Yes**.

**في Railway:** خدمة **backend** ← **Variables**. لا تُكتب كلمة المرور في أي ملف أو رسالة.

| المتغير | القيمة |
|---|---|
| `SMTP_HOST` | `smtp.migadu.com` |
| `SMTP_PORT` | `465` |
| `SMTP_SECURE` | `true` |
| `SMTP_USER` | `website@msp.sa` (عنوان الصندوق كاملاً) |
| `SMTP_PASS` | كلمة مرور الصندوق (سرّية) |
| `MAIL_FROM` | `MSP Website <website@msp.sa>` |
| `INQUIRY_NOTIFY_TO` | `info@msp.sa` (يمكن إضافة أكثر من عنوان مفصولة بفواصل) |

**ما يحدث بعد الضبط:**
- يعيد Railway تشغيل الخدمة تلقائياً.
- كل طلب جديد يصل إلى `INQUIRY_NOTIFY_TO`، وعنوان الرسالة بالصيغة «New website enquiry — الخدمة — الاسم».
- **الرد على الرسالة يذهب مباشرة إلى العميل** (Reply-To).
- إن تعطّل البريد، يُحفظ الطلب كالمعتاد ولا يرى الزائر أي خطأ، ويُسجَّل الخطأ في سجلات Railway.

**اختبار بعد الضبط:** أرسل طلباً من `https://www.msp.sa/contact`، وتأكد من وصوله إلى `info@msp.sa`، ثم احذفه من **Admin → Messages**.

**مستحسن:** سجلات DKIM غير موجودة حالياً، وسياسة DMARC هي `p=quarantine`. أضف ثلاثة سجلات CNAME في Cloudflare من لوحة Migadu (**Domain → DNS setup**): `key1._domainkey` و`key2._domainkey` و`key3._domainkey`.

---

## 4. الخصوصية والموافقة — **من ينفّذ: المستشار القانوني**

### الوضع الحالي
- التحليلات **غير مفعّلة**، ولا يوجد أي سكربت تتبّع أو ملفات تعريف تحليلية.
- سياسة الخصوصية الحالية (`/privacy`) نص مؤقت، وفيها ثلاث نقاط لم تعد دقيقة:
  1. تذكر جمع «الاسم والبريد والرسالة» فقط، والنموذج يجمع أيضاً **رقم الجوال (اختياري)** و**الخدمة المطلوبة (اختياري)**.
  2. تقول «لا نشارك البيانات مع أطراف ثالثة»، وتفعيل GA4 يرسل بيانات استخدام إلى Google.
  3. لا تذكر مزوّدي الخدمة: Cloudflare (توصيل المحتوى)، وRailway (الاستضافة)، وMigadu (البريد).

### المطلوب قرار المستشار فيه
1. **الموافقة:** الموقع مهيأ ليطلب موافقة صريحة قبل أي تحليلات (موافق / رفض بنفس الوضوح)، ويحفظ الاختيار في متصفح الزائر فقط. هل هذا كافٍ وفق نظام حماية البيانات الشخصية ولوائحه؟
2. **نقل البيانات خارج المملكة:** Google وCloudflare وRailway قد تعالج البيانات خارج المملكة. ما الصياغة والشروط المطلوبة؟
3. **مدة الاحتفاظ:** المقترح 14 شهراً في GA4. ورسائل التواصل: مدة يحددها المكتب.
4. **الاسم القانوني** في السياسة، بعد التحقق من السجل التجاري.

### مسودة للمراجعة القانونية (ليست نصاً معتمداً)

**English**
> **Information we collect.** When you contact us we collect your name, email address and message, and — if you choose to provide them — your phone number and the service you are interested in. We use this only to respond to your enquiry and discuss potential work.
>
> **Website analytics (only with your consent).** If you accept analytics, we use Google Analytics 4 to understand how the site is used: pages visited, and whether a contact form was sent or a phone, email or WhatsApp link was used. Google Analytics never receives your name, email, phone number or message. Google signals and advertising features are disabled. You can change your choice at any time using "Analytics choice" at the bottom of every page.
>
> **Service providers.** Our hosting (Railway), content delivery (Cloudflare), email (Migadu) and, with your consent, analytics (Google) providers process data on our behalf and may do so outside the Kingdom of Saudi Arabia.
>
> **Retention.** Enquiries are kept for [period set by MSP]; analytics data for 14 months.
>
> **Your rights.** You may ask to access, correct or delete your information by writing to info@msp.sa.

**العربية**
> **المعلومات التي نجمعها:** عند تواصلك معنا نجمع اسمك وبريدك الإلكتروني ورسالتك، ورقم جوالك والخدمة التي تهمك إن اخترت تقديمهما، ولا نستخدمها إلا للرد على طلبك ومناقشة العمل المحتمل.
>
> **تحليلات الموقع (بموافقتك فقط):** إن وافقت على التحليلات، نستخدم Google Analytics 4 لفهم طريقة استخدام الموقع: الصفحات التي زرتها، وهل أُرسل نموذج تواصل أو استُخدم رابط هاتف أو بريد أو واتساب. لا يتلقى Google Analytics اسمك أو بريدك أو رقم جوالك أو رسالتك، وميزات الإعلانات وإشارات Google متوقفة. ويمكنك تغيير اختيارك في أي وقت من «خيار التحليلات» أسفل كل صفحة.
>
> **مزوّدو الخدمة:** يعالج مزوّدو الاستضافة (Railway) وتوصيل المحتوى (Cloudflare) والبريد (Migadu) والتحليلات (Google، بموافقتك) البيانات نيابةً عنا، وقد يتم ذلك خارج المملكة العربية السعودية.
>
> **مدة الاحتفاظ:** تُحفظ الطلبات لمدة [يحددها المكتب]، وبيانات التحليلات لمدة 14 شهراً.
>
> **حقوقك:** يمكنك طلب الاطلاع على معلوماتك أو تصحيحها أو حذفها بمراسلتنا على info@msp.sa.

**بعد اعتماد النص:** يُستبدل نص صفحة `/privacy` في `FrontEnd/src/app/pages/legal/legal-page.ts`. وبعد اعتماد السياسة والموافقة فقط يُضاف معرّف GA4 (البند 2، الخطوة 8).

---

## 5. حذف الطلب التجريبي — **من ينفّذ: مدير المحتوى في لوحة التحكم**

أُرسل هذا الطلب يوم 2026-10-15 للتحقق من النموذج، وهو ليس بيانات عميل. تحقق من تطابق الحقول كلها قبل الحذف:

| الحقل | القيمة |
|---|---|
| المعرّف | `58a53607-642b-46c9-818e-62d3f1d7a25f` |
| الاسم | `MSP website test — please delete` |
| البريد | `mansour@msp.sa` |
| العنوان | `Enquiry: Construction Supervision` |
| الرسالة تبدأ بـ | `Automated verification of the live contact form on 2026-10-15` |
| وقت الإنشاء | 2026-10-15 16:18 UTC |

الخطوات: **Admin → Messages** ← افتح الرسالة ← تحقق من الحقول أعلاه ← **Delete**. لا تحذف أي رسالة لا تطابق كل الحقول.

---

## 6. التعريفات المعتمدة

| المصطلح | التعريف |
|---|---|
| **Inquiry (طلب)** | طلب تواصل حقيقي |
| **Qualified Lead (عميل مؤهَّل)** | عميل محتمل حقيقي يمكن التواصل معه، لديه حاجة ذات صلة باستشارات معمارية أو هندسية، ضمن خدمات MSP وسوقها المستهدف، مع فرصة واقعية للمتابعة |
| **Won Project (مشروع مُكتسَب)** | فرصة مؤهَّلة تحوّلت إلى عقد موقَّع |

**قواعد التسجيل:**
- كل طلب، سواء جاء من النموذج أو بالهاتف أو البريد أو واتساب، يُسجَّل مرة واحدة في سجل الطلبات `MSP-LEAD-LOG-TEMPLATE.csv`.
- الطلب الوهمي أو الإعلاني أو المكرر لا يُعدّ Inquiry.
- يُحدَّد «مؤهَّل» بعد أول تواصل.

---

## 7. التقارير

| المؤشر | المصدر | طريقة القياس |
|---|---|---|
| الزيارات العضوية | GA4 | Reports → Acquisition → Traffic acquisition، القناة = Organic Search |
| الظهور والنقرات | Search Console | Performance: Total impressions، Total clicks، CTR، Average position |
| ظهور كلمات الخدمات | Search Console | Performance → Queries، مع تصفية صفحات `/services/` |
| تحويلات النموذج | GA4 | Key event `generate_lead`، مقسّماً حسب `form` و`service` |
| نقرات التواصل | GA4 | `phone_click` و`email_click` و`whatsapp_click` |
| الطلبات | سجل الطلبات | عدد الصفوف بحالة `genuine = yes` |
| العملاء المؤهَّلون | سجل الطلبات | عدد `qualified = yes` |
| المشاريع المكتسبة | سجل الطلبات | عدد `stage = won` |
| معدل التحويل من مؤهَّل إلى عميل | محسوب | المشاريع المكتسبة ÷ العملاء المؤهَّلون |
| معدل التحويل من طلب إلى عميل | محسوب | المشاريع المكتسبة ÷ الطلبات |

**الجدول الشهري:** `MSP-MONTHLY-REPORT-TEMPLATE.md`.

**ملاحظات:**
- `phone_click` يعني أن الزائر نقر رابط الاتصال، لا أن المكالمة تمّت. المكالمات الفعلية تُسجَّل يدوياً في سجل الطلبات.
- الأرقام قبل تفعيل GA4 غير متاحة. خط أساس GA4 يبدأ من يوم التفعيل، أما Search Console فيعطي 16 شهراً بأثر رجعي.
- **طلبات نموذج الصفحة الرئيسية قبل 2026-10-15 لم تُحفظ أصلاً** بسبب خلل أُصلح في ذلك اليوم.
