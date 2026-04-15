---
name: add-template
description: "Add a new email template or email signature to the email-worker. Use when: new email body template, new HTML signature, new language template, add bilingual template, register template in Oracle, register signature in Oracle, WORKER_MAIL_TEMPLATE_REGISTRY, WORKER_MAIL_SIGNATURE_REGISTRY, new templateKey, new signatureKey."
argument-hint: "template|signature <key> <language> — e.g. template data_v2 AR"
---

# Add a New Email Template or Signature

## When to Use
- تضيف email body template جديدة (HTML file + Oracle registry record)
- تضيف signature جديدة (HTM file + image inlining + Oracle registry record)
- تضيف نسخة لغة جديدة (AR / EN) لـ template أو signature موجودة

## Template System Overview

```
src/templates/
├── shared/
│   ├── emails/
│   │   ├── data.ar.html         ← DATA email body (Arabic)
│   │   ├── data.en.html         ← DATA email body (English)
│   │   ├── no_data.ar.html      ← NO_DATA email body (Arabic)
│   │   └── no_data.en.html      ← NO_DATA email body (English)
│   └── signatures/
│       ├── ar/
│       │   ├── raw/
│       │   │   └── AlahlyINV_Signature.htm   ← Company signature HTML
│       │   └── default.html                  ← Wrapper template
│       └── en/
│           ├── raw/
│           │   └── AlahlyINV_Signature.htm
│           └── default.html
```

**Oracle tables:**
- `WORKER_MAIL_TEMPLATE_REGISTRY` → templateKey → bodyFile path
- `WORKER_MAIL_SIGNATURE_REGISTRY` → signatureKey → signatureFile path

---

## Part A — Add a New Email Body Template

### Step A1 — Create the HTML file

المكان: `src/templates/shared/emails/<key>.<lang>.html`

مثال: `src/templates/shared/emails/data_v2.en.html`

**Placeholders المتاحة:**

| Placeholder | النوع | الوصف |
|-------------|-------|-------|
| `{{reportName}}` | escaped | اسم الـ report |
| `{{closeDate}}` | escaped | تاريخ الإغلاق YYYYMMDD |
| `{{rowCount}}` | escaped | عدد الصفوف |
| `{{fileName}}` | escaped | اسم الملف المرفق |
| `{{{signatureHtml}}}` | raw (unescaped) | HTML الـ signature — استخدم `{{{` |

> `{{var}}` = HTML-escaped. `{{{var}}}` = raw HTML injection.

```html
<!DOCTYPE html>
<html dir="ltr" lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; font-size: 14px; }
    .report-info { background: #f5f5f5; padding: 12px; border-radius: 4px; }
  </style>
</head>
<body>
  <p>Dear Team,</p>
  <p>Please find attached the <strong>{{reportName}}</strong> for <strong>{{closeDate}}</strong>.</p>

  <div class="report-info">
    <p>Records: {{rowCount}}</p>
    <p>File: {{fileName}}</p>
  </div>

  <p>Best regards,</p>

  {{{signatureHtml}}}
</body>
</html>
```

### Step A2 — Register in Oracle

```sql
INSERT INTO back_office.WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, BODY_FILE, DIRECTION, IS_ACTIVE)
VALUES
  ('data_v2', 'EN',
   'templates/shared/emails/data_v2.en.html',
   'LTR',
   'Y');

-- نسخة عربية (لو محتاج)
INSERT INTO back_office.WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, BODY_FILE, DIRECTION, IS_ACTIVE)
VALUES
  ('data_v2', 'AR',
   'templates/shared/emails/data_v2.ar.html',
   'RTL',
   'Y');

COMMIT;
```

### Step A3 — Update mail rules to use new key

```sql
UPDATE back_office.WORKER_MAIL_RULES
SET TEMPLATE_KEY = 'data_v2'
WHERE DOMAIN = '<domain>' AND REPORT_CODE = '<report-id>';

COMMIT;
```

---

## Part B — Add a New Signature

### Step B1 — Create signature files

**المكان:**
```
src/templates/shared/signatures/
└── <lang>/
    ├── raw/
    │   ├── <SignatureName>.htm       ← الـ HTML الأصلي للـ signature
    │   └── <SignatureName>_files/    ← الصور والـ CSS (لو موجودين)
    │       ├── image001.png
    │       └── ...
    └── default.html                  ← Wrapper template (غالباً لا تحتاج تغييره)
```

> **مهم:** الصور بتتحول تلقائياً لـ base64 data URIs لضمان ظهورها في الإيميل بدون HTTP requests خارجية.

### Step B2 — Verify image inlining

قبل التسجيل، اختبر إن الصور بتتـ inline صح:

```bash
node test-signature-loader.js
# أو
node test-signature-both-languages.js
```

### Step B3 — Register in Oracle

```sql
INSERT INTO back_office.WORKER_MAIL_SIGNATURE_REGISTRY
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE)
VALUES
  ('custom_v1', 'EN',
   'templates/shared/signatures/en/raw/<SignatureName>.htm',
   'Y');

-- نسخة عربية
INSERT INTO back_office.WORKER_MAIL_SIGNATURE_REGISTRY
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE)
VALUES
  ('custom_v1', 'AR',
   'templates/shared/signatures/ar/raw/<SignatureName>.htm',
   'Y');

COMMIT;
```

### Step B4 — Update mail rules to use new signature key

```sql
UPDATE back_office.WORKER_MAIL_RULES
SET SIGNATURE_KEY = 'custom_v1'
WHERE DOMAIN = '<domain>';

COMMIT;
```

---

## Validation Checklist

- [ ] HTML file موجود في المسار الصح داخل `src/templates/`
- [ ] المسار في Oracle يبدأ بـ `templates/` (مش `src/templates/`)
- [ ] `DIRECTION` مضبوط: `LTR` للإنجليزي، `RTL` للعربي
- [ ] Signature: كل الصور في نفس مجلد `_files/` بجانب الـ HTM
- [ ] `IS_ACTIVE = 'Y'`
- [ ] الـ `templateKey` / `signatureKey` في `WORKER_MAIL_RULES` محدَّث

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Template لا يظهر | مسار الـ `BODY_FILE` غلط | تأكد إنه يبدأ بـ `templates/` |
| Signature صور مش بتظهر | صور مش في `_files/` folder | حط الصور جنب الـ HTM في `raw/<Name>_files/` |
| `{{{signatureHtml}}}` بيظهر كـ text | استخدمت `{{` بدل `{{{` | غيّر لـ `{{{signatureHtml}}}` |
| Template مش بيتـ load | `IS_ACTIVE = 'N'` | حدَّث للـ `'Y'` |
