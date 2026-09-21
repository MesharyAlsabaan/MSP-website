# بوابة تأهيل الموردين — دليل التشغيل والنشر (خدمة المكتب)

الحالة (2026-09-21): **مكتمل ومختبر محلياً بمعاينة كاملة. لم يُنشر، لم يُثبَّت، لم تُغيَّر DNS.**

## المعمارية النهائية

```
المورد / الموظف ──HTTPS──▶ www.msp.sa (Railway: الواجهة + CMS الموقع فقط)
        │                                      لا بيانات موردين هنا إطلاقاً
        └──HTTPS──▶ vendors.msp.sa ──Cloudflare Tunnel──▶ [جهاز في المكتب]
                                                          ├─ MSP Vendor Service (Node, 127.0.0.1:3100)
                                                          ├─ PostgreSQL محلي: الحسابات، الطلبات، الإصدارات، المراجعات
                                                          ├─ D:\MSP-VendorService\documents  ← المسودات وقيد المراجعة
                                                          ├─ Archive Agent (نفس الجهاز، يتصل بـ 127.0.0.1)
                                                          └─ \\Server\...\الموردون المعتمدون  ← المعتمد فقط + Excel
```

- **بيانات الموردين كلها في المكتب** منذ إنشاء الحساب: الحسابات، المسودات، المستندات، سجل المراجعات. Railway وGitHub لا يحتويان أي منها.
- **الاعتماد** هو ما يُدرج المورد في «الموردون المعتمدون» والسجل المركزي؛ وليس بداية حفظ بياناته.
- **انقطاع المكتب**: الواجهة تعرض «تعذّر الاتصال بخدمة الموردين — لم يُحفظ شيء» وتسمح بإعادة المحاولة؛ لا تخزين بديل. الإرسال والرفع idempotent فلا تكرار.

## الهويات الثلاث وفصلها
| من | كيف يثبت هويته | ماذا يصل |
|---|---|---|
| المورد | جلسة تُصدرها خدمة المكتب (HS256، `aud=vendor`، سر خاص بالخدمة) | حسابه وطلبه فقط `/api/vendor/*` |
| الموظف | رمز الموقع (RS256، `iss=msp-website`، `aud` يشمل `vendor-service`) — الخدمة تتحقق بالمفتاح **العام** فقط | `/api/admin/vendors/*` حسب الدور (`SUPER_ADMIN`, `VENDOR_REVIEWER`) |
| وكيل الأرشفة | مفتاح خدمة `X-Archive-Key` + **loopback فقط** (يرفض أي طلب عبر النفق) | `/api/archive/*` |

## متطلبات جهاز الخدمة (لم يُحدَّد بعد — ليس الـ DC)
- Windows 10/11 Pro أو Windows Server، على الشبكة الداخلية، تشغيل مستمر.
- Node.js 20 LTS+، PostgreSQL 16، `cloudflared`، NSSM (أو Task Scheduler).
- قرص للبيانات (مثل `D:\MSP-VendorService\`): القاعدة + `documents\` + `mail-outbox\` + `backups\`. تقدير أولي 5–50 GB.
- حساب خدمة محلي محدود (`svc-msp-vendor`): قراءة/كتابة على `D:\MSP-VendorService` وعلى مجلد «الموردون المعتمدون» فقط.
- منفذ 443 للخارج (النفق) — **لا** فتح منافذ للداخل.

## التثبيت (خطوات مقترحة، لا تُنفَّذ قبل تحديد الجهاز)
1. **PostgreSQL**: قاعدة `msp_vendor` ودور `msp_vendor` بكلمة مرور قوية (يحتاج `CREATE EXTENSION uuid-ossp` — مسموح للدور غير الإداري في PG 13+).
2. **الكود**: نسخ `BackEnd/` (بدون `.env` الموقع) إلى `D:\MSP-VendorService\service`، ثم `npm ci --omit=dev && npm run build`.
3. **الإعدادات**: `BackEnd/.env.vendor-service.example` → `.env` مع القيم الفعلية. المفتاح العام للموظفين من الخطوة 5.
4. **القاعدة**: `npm run vendor:migration:run:prod` ثم `npm run vendor:seed` (التصنيفات التجريبية — تُراجع من الأدمن).
5. **مفاتيح الموظفين**: `node deploy/office/generate-staff-keys.mjs` → الخاص إلى Railway (`JWT_PRIVATE_KEY`)، العام إلى `.env` الخدمة. الموقع يبدأ توقيع RS256 بمجرد ضبط المتغير؛ الرموز القديمة تنتهي خلال 15 دقيقة.
6. **الخدمة**: NSSM → `node dist\vendor-service.main.js` بحساب `svc-msp-vendor`، تشغيل تلقائي، سجلات في `logs\`.
7. **وكيل الأرشفة**: على نفس الجهاز، `apiBaseUrl = http://127.0.0.1:3100/api` (انظر `ArchiveAgent/README.md`)، مفتاح من الأدمن.
8. **النفق**: `deploy/office/cloudflared-config.example.yml` — تسجيل الدخول لحساب Cloudflare الذي يدير `msp.sa`، إنشاء النفق، توجيه `vendors.msp.sa` (الاسم **متاح** حالياً: NXDOMAIN، وnameservers النطاق على Cloudflare)، تثبيت كخدمة.
9. **Cloudflare** (لا يُفترض جاهزيته): قاعدة WAF وrate limiting على `vendors.msp.sa/api/vendor/auth/*`، وضع SSL Full، وقاعدة cache bypass للنطاق (الخدمة ترسل `no-store` أصلاً).
10. **الواجهة**: `environment.prod.ts → vendorApiUrl = https://vendors.msp.sa/api`؛ نشر Railway.
11. **اختبار الربط الفعلي** بحساب مورد داخلي وبريد اختبار قبل الإعلان.

## النسخ الاحتياطي والاستعادة (يديره المكتب)
- `deploy/office/backup-vendor-service.ps1` يومياً: `pg_dump` (لقطة متسقة بلا إيقاف) + نسخ `documents\` (ملفات مُعنونة بالمحتوى لا تتغير بعد كتابتها) + الاحتفاظ 30 يوماً. `.env` **لا يُنسخ** — مكانه مدير كلمات المرور.
- الأرشيف المعتمد (`الموردون المعتمدون`) ضمن نسخ المكتب المعتادة.
- الاستعادة: `pg_restore` للقاعدة + إعادة `documents\` + نفس `.env` → تشغيل الخدمة. الوكيل يستأنف من `state.json` وكل خطواته idempotent.

## متغيرات البيئة
- **خدمة المكتب**: `BackEnd/.env.vendor-service.example` (موثّق سطراً سطراً).
- **الموقع (Railway)**: `JWT_PRIVATE_KEY`, `JWT_ISSUER=msp-website`, `JWT_AUDIENCE=msp-admin,vendor-service`. لا `VENDOR_*` ولا SMTP على Railway.
- **بريد الإشعارات**: `VENDOR_REVIEW_INBOX=supply@msp.sa` مستقل عن حساب الإرسال (`SMTP_*`, `MAIL_FROM`) الذي يُضبط ويُختبر على حدة. أثناء التطوير: outbox ملفّي.

## الأدوار
`VENDOR_REVIEWER` (جديد) للمراجعة والقرارات وطلب التحديث؛ `SUPER_ADMIN` كل شيء بما فيه التصنيفات ومفاتيح الوكلاء. يُمنح من Admin → Users. الموردون ليسوا مستخدمين في الموقع أبداً.

## دورة الحياة
```
draft ─ submit ─▶ under_review ─ request-completion ─▶ needs_completion (مسودة جديدة v+1) ─ submit ─▶ under_review
under_review ─ approve ─▶ approved ─ request-update ─▶ needs_completion ─▶ … ─▶ approved (إصدار أحدث؛ السابق يبقى مؤرشفاً)
under_review / needs_completion ─ reject ─▶ rejected
```
`REQ-YYYY-NNNN` يصدر عند أول إرسال ويثبت؛ `SUP-NNNNNN` عند إنشاء المورد. الاعتماد + مهمة الأرشفة معاملة واحدة.

## التراجع
إعادة نشر النسخة السابقة للموقع تُخفي البوابة؛ خدمة المكتب توقف بـ `nssm stop`؛ البيانات تبقى على الجهاز. لا حذف تلقائي في أي مكان.

## قرارات مؤجلة
1. جهاز الخدمة الفعلي ومسار الأرشيف (`\\Server\Contracting\الموردون المعتمدون` مقترح؛ يحتاج تحقق).
2. تفعيل النفق وDNS (`vendors.msp.sa`) — بعد تحديد الجهاز.
3. القائمة النهائية للتصنيفات والمستندات الإلزامية.
4. حساب SMTP للإرسال.
5. سياسة الاحتفاظ بالمستندات المؤقتة بعد الاعتماد (لا حذف الآن).
