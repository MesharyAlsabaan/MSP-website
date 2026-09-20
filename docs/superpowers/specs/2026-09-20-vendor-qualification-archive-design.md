# نظام تأهيل الموردين والربط مع أرشيف المكتب — مستند التصميم

**التاريخ:** 2026-09-20 · **الحالة:** معتمد للتطوير والاختبار المحلي فقط · **المالك:** م. منصور · **الإعداد:** نورة

> **مصطلحات ثابتة:** المورد = Vendor (`SUP-000123`). الطلب = Application (`REQ-2026-0042`) وله إصدارات داخلية v1/v2/v3.
> **حالة التأهيل** (`under_review / needs_completion / approved / rejected`) منفصلة تماماً عن **حالة الأرشفة** (`pending / transferring / completed / failed`).

## 1. الهدف والحدود

- الموقع يبقى على Railway والكود على GitHub. **لا بيانات موردين ولا مستنداتهم في GitHub.**
- الهدف: مورد يسجّل ويرفع مستنداته → الفريق يراجع ويعتمد → المورد المعتمد يظهر تلقائياً في أرشيف الشركة (شبكة المكتب) في مجلد تصنيفه، مع ملف Excel مركزي وملف Excel خاص به، بلا نقل يدوي وبلا تكرار.
- خارج نطاق المرحلة الأولى: حسابات للموردين، حذف تلقائي للمستندات المؤقتة، تحديث Excel → النظام (الاتجاه واحد: النظام → Excel).

## 2. ما هو موجود وما يُبنى

الموجود في المستودع: NestJS 10 + TypeORM + Postgres، مصادقة JWT، أدوار `SUPER_ADMIN / CONTENT_MANAGER / EDITOR`، `RolesGuard`، `ThrottlerModule`، `helmet`، رفع صور فقط (`uploads/` يُقدَّم علنياً)، Angular 20 مع ترجمة عربي/إنجليزي، لوحة أدمن.
غير موجود: أي كيان أو صفحة أو بريد أو تخزين مستندات يخص الموردين. كل ما يلي يُبنى من الصفر باتباع أنماط الكود الحالية.

## 3. نموذج البيانات (Postgres عبر migrations — `synchronize` معطّل)

| الجدول | الغرض | الأعمدة الأساسية |
|---|---|---|
| `vendors` | الهوية الثابتة | `id`, `vendor_number` (SUP-…, unique, من sequence لا يُعاد استخدامه), `company_name`, `company_name_en`, `primary_category_key`, `secondary_category_keys[]`, `approved_revision_id` (nullable), timestamps |
| `vendor_applications` | الطلب | `id`, `request_number` (REQ-YYYY-NNNN, unique, عدّاد سنوي بقفل صف), `vendor_id`, `status` (enum التأهيل), `current_revision_no`, `submitter_email` |
| `vendor_application_revisions` | إصدار **غير قابل للتعديل** بعد الإرسال | `id`, `application_id`, `revision_no`, `data` JSONB (الشركة، التواصل، العنوان، أرقام التسجيل، التصنيفات), `submitted_at`, `decision` (null/approved/rejected/needs_completion), `decided_at`, `decided_by_user_id` |
| `vendor_stored_files` | مخزن **مُعنون بالمحتوى** | `id`, `sha256` (unique), `size_bytes`, `mime`, `storage_key`, `created_at` — الملف غير المتغير بين الإصدارات يُخزَّن مرة واحدة |
| `vendor_revision_documents` | مستند ضمن إصدار | `id`, `revision_id`, `doc_type_key`, `original_filename`, `stored_file_id`, `expires_at` (nullable) |
| `vendor_review_events` | سجل القرارات (append-only) | `id`, `application_id`, `revision_id`, `action` (submitted/resubmitted/completion_requested/approved/rejected), `note`, `missing_items` JSONB, `actor_user_id` (null للمورد), `created_at` |
| `vendor_archive_jobs` | مهمة أرشفة لإصدار معتمد بعينه | `id`, `revision_id` (unique), `vendor_id`, `sequence_no` (= revision_no للترتيب), `status`, `attempts`, `lease_owner`, `lease_token`, `lease_expires_at`, `last_error`, `archive_path`, `completed_at`, `last_step` |
| `vendor_completion_tokens` | رابط الاستكمال | `id`, `application_id`, `token_hash`, `expires_at`, `used_at` |
| `vendor_categories` | التصنيفات (بيانات قابلة للتعديل) | `key`, `name_ar`, `name_en`, `active`, `sort_order` |
| `vendor_document_requirements` | المستندات المطلوبة لكل تصنيف | `id`, `category_key`, `doc_type_key`, `name_ar`, `name_en`, `required`, `requires_expiry`, `archive_folder` (اسم المجلد العربي) |
| `archive_agent_keys` | مفاتيح خدمة الأرشفة | `id`, `name`, `key_hash`, `active`, `last_seen_at`, `last_heartbeat` JSONB |

**قواعد الثبات:**
- الإصدار بعد `submitted_at` لا يتغير. الاستكمال = إصدار جديد بنفس رقم الطلب.
- الاعتماد = معاملة واحدة في قاعدة البيانات: قرار الإصدار + حالة الطلب + `vendors.approved_revision_id` + حدث المراجعة + مهمة الأرشفة. **لا اعتماد بلا مهمة أرشفة.**
- `sha256` هو مفتاح التخزين: إعادة رفع ملف مطابق لا تخزّنه مرة أخرى.

## 4. الأدوار والصلاحيات

- يُضاف `Role.VendorReviewer = 'VENDOR_REVIEWER'`. مراجعة/اعتماد الموردين: `SUPER_ADMIN` و`VENDOR_REVIEWER` فقط. **لا تُمنح لـ `CONTENT_MANAGER`.**
- خدمة الأرشفة ليست مستخدماً؛ تُصادَق بمفتاح خدمة في الرأس `X-Archive-Key` (hash في `archive_agent_keys`، قابل للإلغاء، يُنشأ من الأدمن ويُعرض مرة واحدة).

## 5. مسار المورد (عام)

1. `GET /api/vendors/categories` → التصنيفات ومتطلبات مستنداتها.
2. `POST /api/vendors/applications` (multipart) → يتحقق: الحقول، التصنيف، المستندات الإلزامية للتصنيف الأساسي، نوع الملف (امتداد + magic bytes: pdf/jpg/png/docx/xlsx)، ≤ 15 MB للملف، ≤ 80 MB للإصدار، ≤ 12 ملفاً، حقل honeypot، throttle خاص (5 طلبات/دقيقة/IP على مسارات الموردين). يُنشئ Vendor + Application + Revision v1 + المستندات + حدث `submitted`، يرسل بريد الفريق، ويعيد `{ requestNumber, vendorNumber }`.
3. عند طلب استكمال: بريد للمورد برابط `/vendors/resume/<token>` — token عشوائي 32 بايت، يُخزَّن hash فقط، صلاحية 14 يوماً، **يُلغى عند الاستخدام**، ويُرفض إن كان الطلب معتمداً/مرفوضاً.
4. `GET /api/vendors/applications/resume/:token` → بيانات آخر إصدار + قائمة النواقص للتعبئة المسبقة. `POST …/resume/:token` (multipart) → إصدار جديد v(n+1)، الملفات غير المتغيرة تُعاد الإشارة إليها بالـ sha256 دون رفع مكرر، الحالة تعود `under_review`، حدث `resubmitted`، بريد الفريق.

## 6. المراجعة (الأدمن)

- `GET /api/admin/vendors` (قائمة + فلاتر + حالتا التأهيل والأرشفة)، `GET /api/admin/vendors/:id` (الطلب، الإصدارات، المستندات، سجل الأحداث، مهام الأرشفة)، `GET /api/admin/vendors/documents/:docId` (تنزيل مصادَق).
- `POST /api/admin/vendors/applications/:id/request-completion {missingItems[], note}` · `…/approve {note}` · `…/reject {reason}` — كل قرار يعمل على **الإصدار الحالي فقط**، ويُرفض إن كان الطلب معتمداً أو مرفوضاً بالفعل.
- بريد الفريق: ملخص + رابط `/admin/vendors/<id>`؛ الرابط لا يمنح صلاحية — يتطلب تسجيل دخول بدور مخوَّل.
- إدارة التصنيفات والمتطلبات ومفاتيح الأرشفة: endpoints للأدمن (`SUPER_ADMIN`).
- شاشة حالة الأرشفة: آخر heartbeat، المهام المعلّقة، الفاشلة مع السبب، زر إعادة المحاولة (يعيد `failed → pending`).

## 7. البريد

`MailService` على nodemailer. الإعدادات `SMTP_HOST/PORT/USER/PASS/FROM`, `VENDOR_REVIEW_INBOX`. إن لم تُضبط → transport ملفّي يكتب `.eml` إلى `mail-outbox/` (للاختبار المحلي) ويسجّل سطراً. **لا افتراض بجاهزية `vendors@msp.sa` أو حساب Migadu.** الرسائل: إشعار الفريق (تقديم/إعادة تقديم)، طلب استكمال للمورد، إشعار اعتماد/رفض للمورد.

## 8. تخزين المستندات قبل الاعتماد (طبقة قابلة للاستبدال)

واجهة `DocumentStorage { put(key, stream), get(key): stream, stat(key), exists(key) }` مع تنفيذ أولي `LocalDiskStorage` في مجلد `VENDOR_DOCS_DIR` (افتراضي `vendor-docs/`، **لا يُقدَّم علنياً أبداً**، خارج `uploads/`). التنفيذات اللاحقة (Railway Volume / S3-compatible / bytea) تُضاف دون تغيير المنطق.
**القرار النهائي مؤجَّل** لحين فحص Railway (Volume، النسخ الاحتياطي، التكلفة) — انظر §13. لا حذف تلقائي في هذه المرحلة.

## 9. واجهة الأرشفة (`/api/archive`, مفتاح خدمة)

| Endpoint | السلوك |
|---|---|
| `GET /archive/jobs` | المهام `pending` أو التي انتهى حجزها، مرتبة `vendor_number, sequence_no` |
| `POST /archive/jobs/:id/lease {agentId, ttlSec}` | حجز مؤقت. يُرفض 409 إن كانت محجوزة بحجز سارٍ، أو **إن وُجدت مهمة أقدم غير مكتملة لنفس المورد** (الترتيب). يعيد manifest: بيانات المورد، الإصدار، القرار (المعتمِد، التاريخ، الملاحظة)، المستندات (النوع، الاسم الأصلي، الحجم، sha256، المجلد الهدف) |
| `POST /archive/jobs/:id/renew` | تمديد الحجز (أثناء انتظار Excel مثلاً) |
| `GET /archive/jobs/:id/documents/:docId` | تدفّق الملف مع `Content-Length` و`X-Checksum-SHA256` — يتطلب حجزاً سارياً لهذا العميل |
| `POST /archive/jobs/:id/complete {leaseToken, archivePath}` | `completed` (idempotent) |
| `POST /archive/jobs/:id/fail {leaseToken, error}` | `attempts++`، يعود `pending`؛ بعد 10 محاولات → `failed` (يظهر للأدمن) |
| `POST /archive/heartbeat {agentId, stats}` | يُخزَّن في `archive_agent_keys.last_heartbeat` لعرض آخر نجاح/معلّق/أخطاء |

## 10. خدمة المكتب (`ArchiveAgent/`)

Node.js LTS + TypeScript (نفس لغة المشروع)، `exceljs` للـ xlsx. تعمل على Windows بحساب خدمة محدود (قراءة/كتابة على مجلد الأرشيف فقط). **لا تُثبَّت على الـ Domain Controller.**

- **الإعدادات:** `config.json` (apiBaseUrl, archiveRoot, pollIntervalSec, leaseTtlSec, agentId, logDir) — المفتاح من متغير البيئة `ARCHIVE_AGENT_KEY` فقط.
- **القفل:** محلياً `archiveRoot/_agent/agent.lock` (PID + timestamp يتجدد؛ قفل أقدم من 3× الفترة يُعتبر متبقياً من تعطل ويُستولى عليه). بين الأجهزة: حجز الخادم (§9).
- **الحالة:** `state.json` يُكتب ذرّياً (temp → rename) بعد كل خطوة؛ لكل مهمة `lastStep ∈ {leased, downloaded, previousVersionArchived, filesPlaced, vendorExcel, decisionSaved, shortcuts, register, completed}` والاستئناف من الخطوة التالية.
- **التنزيل:** إلى `archiveRoot/_incoming/<jobId>/<docId>.part` → تحقق الحجم + sha256 → إعادة تسمية `.ok`. ملف `.ok` بمطابقة hash لا يُنزَّل ثانية. **لا يُستبدل ملف سليم بتنزيل ناقص.**
- **الوضع النهائي:** `archiveRoot/<التصنيف>/<SUP-000123 - اسم الشركة>/<مجلد النوع>/<الاسم الأصلي>` — الاسم يُنظَّف من `\ / : * ? " < > |` ويُقصّ لطول آمن، ويدعم العربية. النسخ إلى `.part` بجانب الهدف ثم `rename` (يُختبر على مشاركة Windows فعلية قبل وصفه بالذرّي).
- **الإصدارات:** ملف `.msp-archive.json` داخل مجلد المورد يسجّل `revisionNo/jobId/completedAt`. إن كان الإصدار الوارد ≤ المسجَّل → تُعتبر المهمة منجزة (idempotent). إن كان أحدث → المجلدات الحالية تُنقل إلى `_إصدارات سابقة/v{n} - {تاريخ الاعتماد}/` ثم يوضع الجديد. لا حذف أبداً.
- **التصنيفات الثانوية:** مجلد بنفس الاسم يحوي `افتح مجلد المورد.url` يشير إلى مجلد الأصل (نسخة أصلية واحدة). **يُختبر فتحه على أجهزة الموظفين.**
- **Excel:** `بيانات المورد.xlsx` (ورقة بيانات + ورقة مستندات بروابط نسبية + ورقة قرارات). `سجل الموردين.xlsx` في الجذر: صف لكل مورد (upsert بـ `vendor_number`)، الأعمدة: رقم المورد، رقم الطلب، الإصدار، اسم الشركة، التصنيف، التصنيفات الثانوية، التخصص، مسؤول التواصل، الهاتف، الجوال، البريد، المدينة، العنوان، السجل التجاري، الرقم الضريبي، تاريخ الاعتماد، المعتمِد، أقرب انتهاء وثيقة، رابط المجلد، آخر تحديث. الكتابة: قراءة → تعديل → كتابة `~tmp` → استبدال. إن كان مفتوحاً (EBUSY/EPERM) → تبقى المهمة عند خطوة `register` مع تجديد الحجز وإعادة المحاولة كل دورة؛ **لا تُعلَن مكتملة قبل نجاح Excel**، ولا تُكرَّر الخطوات السابقة.
- **السجلات:** ملفات دوّارة في `logDir`، بلا مفاتيح أو بيانات تواصل؛ الأخطاء تُبلَّغ للخادم كنص مختصر.
- **التشغيل:** خدمة Windows (NSSM أو `sc.exe` مع `node`)، تبدأ تلقائياً، و`--once` للتشغيل اليدوي.

## 11. الموثوقية — خريطة المتطلبات

| المتطلب | الآلية |
|---|---|
| اعتماد بلا مهمة أرشفة مستحيل | معاملة واحدة (§3) |
| تشغيل من جهازين | حجز خادم بمهلة + `lease_token` (§9) |
| ترتيب الإصدارات | رفض حجز مهمة أحدث قبل إكمال الأقدم لنفس المورد + `.msp-archive.json` |
| انقطاع الشبكة/المكتب | الطلب يبقى معتمداً و`pending`؛ الخدمة تستأنف من `state.json` |
| قفل متبقٍ بعد تعطل | قفل بزمن يتجدد + حجز خادم ينتهي |
| ملف ناقص | `.part` + sha256 قبل أي استبدال |
| Excel مفتوح | temp+replace، إعادة محاولة الجزء المتبقي فقط |
| تكرار | `revision_id` unique في المهام، upsert بـ `vendor_number`، إيصالات idempotent |
| المراقبة | heartbeat + شاشة الأدمن (آخر نجاح، معلّق، فاشل) |

## 12. الاختبار

- وحدات (jest): آلة الحالات، الترقيم، تنظيف الأسماء، بناء المسارات، منطق الاستئناف، dedupe بالـ sha256، صلاحيات الأدوار.
- تكامل محلي: schema اختبار معزول في Postgres المحلي، مجلد أرشيف تجريبي محلي، بريد إلى `mail-outbox/`.
- رحلة كاملة: تسجيل → استكمال → إعادة إرسال → اعتماد → أرشفة حسب التصنيف → Excel؛ ثم: قطع الاتصال أثناء التنزيل واستئناف، Excel مفتوح، تشغيل الخدمة مرتين، إعادة اعتماد إصدار جديد، إعادة تنفيذ نفس المهمة (لا تكرار).
- اختبار `rename`/الاستبدال والاختصارات على مشاركة Windows فعلية (مجلد اختبار داخل `14_Portal MSP\99_Archive`).

## 13. قرارات مؤجَّلة (تُحسم بعد عرض النتائج)

1. التخزين المؤقت النهائي (بعد فحص Railway: Volume/النسخ الاحتياطي/الحجم/التكلفة، مع حساب أثر الإصدارات المتكررة — يخففه التخزين المُعنون بالمحتوى).
2. جهاز تشغيل الخدمة (ليس الـ DC) والمسار الفعلي (`\\Server\Contracting\الموردون المعتمدون\` مقترح فقط).
3. القائمة النهائية للتصنيفات والمستندات الإلزامية.
4. بريد الفريق وحساب الإرسال.
5. ربط الإنتاج، وتثبيت الخدمة، وأي إرسال لموردين حقيقيين.
