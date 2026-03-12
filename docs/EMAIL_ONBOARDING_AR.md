# دليل إضافة إيميل جديد في Email Worker

## الهدف
الدليل ده يشرح طريقتين:
1. إضافة مستلم جديد (email address) لتقارير موجودة بالفعل.
2. إضافة Report جديد بالكامل (وبالتالي إيميل جديد + SQL + Trigger ربط).

---

## كيف يحدد النظام الـ Trigger؟
الـ Trigger بيتحدد من `triggerType` داخل ملف التقرير (`*.report.js`).

المستخدم حاليًا في المشروع:
- `finance` -> `FIN_CLOSE`  
  المصدر: `back_office.BO_OMNI_END_OF_DAY`
- `operations` -> `OPS_CLOSE`  
  المصدر: `back_office.BO_END_OF_DAY`
- `compliance` -> `CMP_CLOSE`  
  المصدر: `back_office.CMP_EMP_TBL_DAILY_ORDERS` (مع `FLAG`)

الملفات المرجعية:
- `src/core/finance/reports/allProfiles.report.js`
- `src/core/operations/reports/dailyOperations.report.js`
- `src/core/compliance/reports/dailyCompliance.report.js`

---

## السيناريو A: إضافة إيميل جديد لتقرير موجود (بدون كود)
لو عايز تضيف شخص جديد يستقبل إيميل تقرير موجود، أنت غالبًا **مش محتاج أي تعديل كود**.

### الذي سيتم إنشاؤه في DB
1. صف جديد في `WORKER_MAIL_ADDRESS` (لو الإيميل غير مسجل).
2. صف جديد في `WORKER_MAIL_GROUP_MEMBER` لربط الإيميل بالجروب المناسب.

بديل: بدل الجروب، ممكن ربط مباشر Rule -> Address من `WORKER_MAIL_RULE_TARGET`.

### خطوات التنفيذ
1. حدد التقرير الهدف (`REPORT_CODE`) والدومين.
2. حدد اللغة المطلوبة (غالبًا `EN` كافتراضي).
3. أضف الإيميل في `WORKER_MAIL_ADDRESS` لو مش موجود.
4. اربطه بجروب الدومين (`FIN_GROUP` أو `OPS_GROUP` أو `CMP_GROUP`) عبر `WORKER_MAIL_GROUP_MEMBER`.
5. تحقق من routing عن طريق view/queries.

### SQL مثال سريع
```sql
-- 1) Add address
INSERT INTO back_office.WORKER_MAIL_ADDRESS
  (ADDRESS_ID, ADDRESS, DISPLAY_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (WORKER_MAIL_ADDRESS_SEQ.NEXTVAL, 'new.user@company.com', 'New User', 'Y', SYSTIMESTAMP);

-- 2) Add to existing group (example: FIN_GROUP = 1)
INSERT INTO back_office.WORKER_MAIL_GROUP_MEMBER
  (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (1, :new_address_id, 'Y', SYSTIMESTAMP);
```

---

## السيناريو B: إضافة Report جديد بالكامل (كود + DB)
ده السيناريو لما تكون بتضيف Report جديد باسم جديد/SQL جديد.

### الذي سيتم إنشاؤه في الكود
1. ملف SQL جديد:
   - `src/core/<domain>/sql/<report>.sql`
2. ملف Report Config جديد:
   - `src/core/<domain>/reports/<name>.report.js`
3. (اختياري) Template HTML جديد لو مش هتستخدم shared template.

### الذي سيتم إنشاؤه في DB
1. قواعد في `WORKER_MAIL_RULES`:
   - `DATA` + `NO_DATA`
   - غالبًا `EN` (ويمكن إضافة `AR` لاحقًا)
2. targets في `WORKER_MAIL_RULE_TARGET` تربط rule بجروب/إيميل.
3. (اختياري) template/signature registry entries:
   - `WORKER_MAIL_TEMPLATE_REGISTRY`
   - `WORKER_MAIL_SIGNATURE_REGISTRY`

### شكل report config مقترح
```js
export const myNewReport = {
  id: 'fin-my-new-report',
  name: 'My New Report',
  sql: 'core/finance/sql/my-new-report.sql',
  format: 'xlsx',
  sheetName: 'Sheet1',
  fileName: 'my_new_report_{CLOSE_DATE}.xlsx',
  recipients: ['placeholder@company.com'], // required by validation, actual send uses DB rules
  subject: 'My New Report - {CLOSE_DATE}',
  triggerType: 'FIN_CLOSE', // or OPS_CLOSE / CMP_CLOSE
  requiredParams: ['close_date'],
  exportWhenEmpty: true,
  enabled: true,
  useDateFolder: true,
};
```

مهم:
- `triggerType` لازم يكون واحد من القيم المسجلة: `FIN_CLOSE`, `OPS_CLOSE`, `CMP_CLOSE`.
- `requiredParams` لازم تكون موجودة فعليًا في SQL، وإلا bootstrap هيفشل.

---

## اللغة الافتراضية (English vs Arabic)
حاليًا سلوكك صحيح:
- الافتراضي `EN` عبر `DEFAULT_EMAIL_LANGUAGE=EN`.
- التحويل للعربي يتم إما:
  - بتغيير `DEFAULT_EMAIL_LANGUAGE=AR`
  - أو بإعداد Rules عربية (`LANGUAGE_CODE='AR'`) واختيارها حسب الحاجة.

يعني ترك الافتراضي إنجليزي قرار صحيح ومتماشي مع الإعداد الحالي.

---

## كيف أقرر أي Trigger أستخدم؟
قاعدة سريعة:
- تقرير مالي Day Close -> `FIN_CLOSE`
- تقرير عمليات Day Close -> `OPS_CLOSE`
- تقرير compliance من `CMP_EMP_TBL_DAILY_ORDERS` -> `CMP_CLOSE`

لو الدومين جديد أو event جديد:
- ستحتاج Trigger Plugin + DB adapter جديدين + تسجيله في `bootstrap`.
- لكن ده خارج نطاق "إضافة إيميل فقط".

---

## Validation Checklist قبل التشغيل
1. SQL file موجود في المسار الصحيح.
2. `triggerType` صحيح ومسجل.
3. mail rules موجودة للتقرير (`DATA` و`NO_DATA`) للغة المطلوبة.
4. rule targets مربوطة بجروب/إيميل فعّال.
5. التحقق عبر query إن routing صحيح.

---

## Queries مفيدة للفحص
```sql
-- Check rules for one report
SELECT RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, IS_ACTIVE, NOTIFY_ENABLED
FROM back_office.WORKER_MAIL_RULES
WHERE REPORT_CODE = :report_code
ORDER BY EVENT_TYPE, LANGUAGE_CODE;

-- Check recipients resolved for one rule
SELECT * 
FROM back_office.WORKER_MAIL_RECIPIENTS_V
WHERE RULE_ID = :rule_id;
```

