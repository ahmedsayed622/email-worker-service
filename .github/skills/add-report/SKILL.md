---
name: add-report
description: "Add a new report to an existing domain in the email-worker. Use when: adding report, new SQL query, new Excel file, new CSV file, new XLSX output, new email report, extend domain with report, create report config."
argument-hint: "<domain> <reportName> — e.g. finance settlementReport"
---

# Add a New Report to an Existing Domain

## When to Use
- إضافة report جديدة لـ domain موجود (finance / operations / compliance)
- تحتاج SQL query + ملف config + mail rule في Oracle

## Prerequisites
- تعرف اسم الـ domain: `finance` | `operations` | `compliance`
- تعرف الـ `triggerType` المناسب: `FIN_CLOSE` | `OPS_CLOSE` | `CMP_CLOSE`
- عندك الـ SQL query الجاهزة

---

## Procedure

### Step 1 — Create the SQL file

المكان: `src/core/<domain>/sql/<reportName>.sql`

قواعد إلزامية (راجع skill `sql-conventions`):
- استخدم `:close_date` bind variable لو بتفلتر بالتاريخ
- بدون `;` في النهاية
- `:close_date` بيكون NUMBER بصيغة YYYYMMDD
- جميع الجداول بـ prefix: `back_office.<TABLE>`

```sql
-- <Report display name>
-- Domain: <domain>
-- Trigger: <TRIGGER_TYPE>
-- close_date filter: YYYYMMDD NUMBER
SELECT
  COL_ONE,
  COL_TWO,
  ...
FROM back_office.<TABLE_NAME>
WHERE SOME_DATE = :close_date
ORDER BY COL_ONE
```

---

### Step 2 — Create the report config file

المكان: `src/core/<domain>/reports/<reportName>.report.js`

```javascript
export const <reportName> = {
  // Identity
  id: '<domain-prefix>-<report-slug>',       // e.g. 'fin-settlement'
  name: '<Report Display Name>',

  // Data source
  sql: 'core/<domain>/sql/<reportName>.sql',
  requiredParams: ['close_date'],             // أو [] لو مش محتاج bind

  // Trigger routing — يطابق ClassName في trigger plugin
  triggerType: '<TRIGGER_TYPE>',             // 'FIN_CLOSE' | 'OPS_CLOSE' | 'CMP_CLOSE'

  // Output
  format: 'xlsx',                            // 'xlsx' | 'csv'
  sheetName: '<Sheet Name>',                 // xlsx فقط
  fileName: '<ReportName>_{CLOSE_DATE}.xlsx',

  // Path — اختر واحد منهم:
  useDateFolder: true,                       // يحط في data/reports/YYYYMMDD/<domain>/
  // customPath: 'export/<Folder Name>',     // أو مسار مخصص

  // Email
  subject: '<Report Name> - {CLOSE_DATE}',
  recipients: [],                            // بيتجاهل — mail rules بتتحكم

  // Behavior
  exportWhenEmpty: true,
  enabled: true,
};
```

**مهم:** `{CLOSE_DATE}` في `fileName` و `subject` بيتحول أوتوماتيك لـ YYYYMMDD.

---

### Step 3 — Export the report from domain reports index

افتح `src/core/<domain>/reports/index.js` لو موجود، أو تأكد إن `domainLoader` بيـ wildcard-import.

> الـ `domainLoader` بيـ glob `*.report.js` تلقائياً — مش محتاج تسجيل يدوي.

---

### Step 4 — Add Oracle mail rule (راجع skill `add-mail-rule`)

```sql
-- DATA rule
INSERT INTO back_office.WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS)
VALUES
  (<ID>, '<domain>', '<report-id>', 'DATA', 'Y', 'Y',
   NULL, 'data_v1', 'default_v1', 'noreply@alahlypharos.com');

-- NO_DATA rule
INSERT INTO back_office.WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS)
VALUES
  (<ID+1>, '<domain>', '<report-id>', 'NO_DATA', 'Y', 'Y',
   ' - No Data', 'no_data_v1', 'default_v1', 'noreply@alahlypharos.com');

-- Recipients
INSERT INTO back_office.WORKER_MAIL_RECIPIENTS
  (ID, RULE_ID, RECIPIENT_TYPE, EMAIL_ADDRESS)
VALUES (<ID>, <RULE_ID_DATA>, 'TO', 'recipient@alahlypharos.com');

COMMIT;
```

---

### Step 5 — Restart the worker

```bash
pm2 restart email-worker
# أو
sudo systemctl restart email-worker
```

الـ `domainLoader` بيـ auto-discover الـ ملفات الجديدة عند الـ startup.

---

## Validation Checklist

- [ ] SQL file موجود في المسار الصح داخل `src/core/`
- [ ] `sql` field في report config يبدأ بـ `core/` (مش `src/core/`)
- [ ] `triggerType` مطابق بالظبط لاسم الـ trigger (`FIN_CLOSE` etc.)
- [ ] `id` فريد — مفيش report تانية بنفس الـ id
- [ ] Mail rule موجود في Oracle لكل من `DATA` و `NO_DATA`
- [ ] Worker أعاد التشغيل

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `SQL_FILE_MISSING` | مسار الـ SQL غلط | تأكد إن `sql` field يبدأ بـ `core/` |
| `ORA-01036` | bind variable في SQL غير موجود في `requiredParams` | أضفه في `requiredParams` |
| Report لا تتشغل | `triggerType` غلط | تأكد من الاسم بالظبط |
| إيميل مش بيتبعت | mail rule مش موجود | اتبع Step 4 |
