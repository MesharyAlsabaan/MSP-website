# MSP Archive Agent — خدمة أرشفة الموردين المعتمدين

خدمة تعمل داخل شبكة المكتب. تسحب من موقع msp.sa (عبر HTTPS) الطلبات **المعتمدة** ومستنداتها، وتحفظها في أرشيف الشركة بالهيكل المتفق عليه، وتحدّث `سجل الموردين.xlsx`، ثم تؤكد للموقع أن الأرشفة اكتملت. لا تكشف أي مشاركة ملفات على الإنترنت: الاتصال دائماً من المكتب إلى الموقع، بمفتاح خدمة مخصص.

```
<جذر الأرشيف>\
├── سجل الموردين.xlsx                       ← صف لكل مورد معتمد (يُحدَّث لا يُكرَّر)
├── <التصنيف الأساسي>\
│   └── SUP-000123 - اسم الشركة\
│       ├── .msp-archive.json               ← علامة الإصدار المؤرشف (لا تحذفها)
│       ├── بيانات المورد.xlsx
│       ├── السجل التجاري\ ، الشهادات والتراخيص\ ، بروفايل الشركة\ ، مستندات أخرى\
│       ├── سجل الاعتماد\قرار v1.json / .txt
│       └── _إصدارات سابقة\v1 - 2026-09-20\  ← عند اعتماد إصدار أحدث
├── <تصنيف ثانوي>\SUP-000123 - اسم الشركة\افتح مجلد المورد.url
└── _incoming\                              ← تنزيلات مؤقتة (تُحذف بعد الاكتمال)
```

## المتطلبات
- Windows 10/11 أو Windows Server 2016+ (**ليس** الـ Domain Controller).
- Node.js LTS 20 أو أحدث (`node --version`).
- حساب خدمة محدود الصلاحيات: **تعديل** على مجلد الأرشيف فقط + قراءة على مجلد الخدمة. لا يحتاج صلاحيات إدارية.
- وصول HTTPS إلى `https://www.msp.sa` (المنفذ 443 للخارج).
- مفتاح خدمة من لوحة الإدارة: **Vendors → Configuration → Archive keys → Create** (يُعرض مرة واحدة).

## التثبيت (مرة واحدة)
1. انسخ مجلد `ArchiveAgent` إلى `C:\MSP\ArchiveAgent` على جهاز التشغيل.
2. في PowerShell داخل المجلد:
   ```powershell
   npm ci --omit=dev
   npm run build
   Copy-Item config.example.json config.json
   ```
3. عدّل `config.json`:
   | المفتاح | المعنى |
   |---|---|
   | `apiBaseUrl` | `https://www.msp.sa/api` (يجب https) |
   | `agentId` | اسم مميز لهذا الجهاز، مثل `office-archive-1` |
   | `archiveRoot` | مسار الأرشيف الفعلي، مثل `\\\\Server\\Contracting\\الموردون المعتمدون` (لاحظ مضاعفة `\` في JSON). **المجلد يجب أن يكون موجوداً** — الخدمة لا تنشئه حتى لا يُكتب في مكان خاطئ عند خطأ إملائي |
   | `pollIntervalSec` | فترة الفحص بالثواني (افتراضي 60) |
   | `leaseTtlSec` | مدة حجز المهمة (افتراضي 600) |
   | `logDir`, `stateDir` | مجلدا السجلات والحالة (نسبيان لمكان config.json) |
4. ضع المفتاح في متغير بيئة للحساب الذي يشغّل الخدمة — **أبداً في config.json**:
   ```powershell
   [Environment]::SetEnvironmentVariable('ARCHIVE_AGENT_KEY', 'msparch_...', 'Machine')
   ```
   (أو في إعدادات الخدمة عبر NSSM كما أدناه.)
5. تشغيل تجريبي يدوي:
   ```powershell
   $env:ARCHIVE_AGENT_KEY = 'msparch_...'
   node dist/main.js --once
   ```
   أكواد الخروج: `0` نجاح · `1` فشلت الجولة (انظر السجل) · `2` خطأ إعدادات · `3` نسخة أخرى تعمل · `4` مسار الأرشيف غير موجود.

## التشغيل كخدمة Windows (تعمل تلقائياً بعد إعادة التشغيل)
الأسهل [NSSM](https://nssm.cc) (ملف تنفيذي واحد):
```powershell
nssm install MspArchiveAgent "C:\Program Files\nodejs\node.exe" "C:\MSP\ArchiveAgent\dist\main.js"
nssm set MspArchiveAgent AppDirectory C:\MSP\ArchiveAgent
nssm set MspArchiveAgent AppEnvironmentExtra ARCHIVE_AGENT_KEY=msparch_...
nssm set MspArchiveAgent ObjectName ".\svc-msp-archive" "<password>"   # حساب الخدمة المحدود
nssm set MspArchiveAgent Start SERVICE_AUTO_START
nssm set MspArchiveAgent AppStdout C:\MSP\ArchiveAgent\logs\service-out.log
nssm set MspArchiveAgent AppStderr C:\MSP\ArchiveAgent\logs\service-err.log
nssm start MspArchiveAgent
```
بديل بلا برامج إضافية: مهمة مجدولة (Task Scheduler) تشغّل `node dist/main.js --once` كل 5 دقائق بحساب الخدمة، مع «Run whether user is logged on or not». الخدمة آمنة ضد التشغيل المتزامن (قفل محلي + حجز على الخادم).

## المراقبة
- **لوحة الإدارة → Vendors**: آخر ظهور للوكيل، آخر نجاح، عدد المهام المنتظرة، المهام الفاشلة وزر إعادة المحاولة.
- **السجل**: `logs\agent.log` (يدور عند 5 MB). لا يحتوي مفاتيح أو بيانات تواصل.
- **الحالة**: `state\state.json` — المهام قيد التنفيذ وخطوتها الأخيرة، آخر نجاح، آخر 20 خطأ.
- **قفل**: `state\agent.lock` — يُزال تلقائياً إذا تُرك بعد تعطل (أقدم من 3× فترة الفحص).

## السلوك عند المشاكل
| الحالة | ما يحدث |
|---|---|
| الموقع غير متاح | الجولة تفشل بسجل واضح؛ المهام تبقى معتمدة و«بانتظار الأرشفة» على الموقع؛ تُستأنف تلقائياً |
| مجلد الأرشيف غير متاح (الشبكة) | تحذير + heartbeat يبلّغ اللوحة «archive folder unreachable»؛ لا يُكتب شيء |
| `سجل الموردين.xlsx` مفتوح في Excel | المستندات تُحفظ، المهمة تنتظر عند خطوة `register`، ويُعاد الجزء المتبقي فقط في الجولة التالية؛ لا تُعلن مكتملة قبل نجاح Excel |
| توقف الخدمة في منتصف مهمة | عند العودة تُستأنف من الخطوة التالية للمحفوظة؛ لا يُعاد تنزيل ملف مُتحقَّق منه |
| ملف ناقص/مختلف الـ hash | يُرفض ولا يستبدل شيئاً؛ تُبلَّغ المهمة كفاشلة ويعيد الموقع جدولتها (حتى 10 محاولات ثم تظهر للأدمن) |
| اعتماد إصدار أحدث لنفس المورد | المجلدات الحالية تُنقل إلى `_إصدارات سابقة\v<n> - <تاريخ>` ثم يوضع الجديد؛ `سجل الاعتماد` تراكمي |
| تغيّر اسم الشركة | يُعاد استخدام المجلد الموجود بنفس `SUP-` |
| تشغيل الخدمة من جهازين | حجز الخادم يمنع العمل على نفس المهمة؛ المهمة الأقدم لنفس المورد أولاً |

## التحديث والتراجع
- تحديث: `nssm stop MspArchiveAgent` → استبدال المجلد (احتفظ بـ `config.json` و`state\`) → `npm ci --omit=dev && npm run build` → `nssm start`.
- تراجع: أعد المجلد السابق. `state.json` متوافق للأمام؛ عند الشك احذفه — كل الخطوات idempotent وسيُعاد التحقق من كل ملف بدل إعادة تنزيله.
- إلغاء مفتاح مسرَّب: لوحة الإدارة → Archive keys → Revoke، ثم أنشئ مفتاحاً جديداً وحدّث متغير البيئة.

## التطوير
```powershell
npm install
npm test          # 32 اختباراً: naming, state, lock, download, register, shortcuts, archiver
npm run dev       # ts-node --once
```
