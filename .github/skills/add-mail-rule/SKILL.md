---
name: add-mail-rule
description: "Add or update email sending rules in Oracle for email-worker. Use when: add mail rule, add email recipients, update recipients, add email rule, WORKER_MAIL_RULES, WORKER_MAIL_RECIPIENTS, new report email rule, change from address, change subject suffix, add language rule, DATA rule, NO_DATA rule."
argument-hint: "<domain> <reportId> — e.g. finance fin-settlement"
---

# Add or Update Mail Rules in Oracle

## When to Use
- إضافة rule جديدة لـ report جديدة
- تغيير المستلمين أو الـ From address
- إضافة نسخة عربية أو إنجليزية لـ rule موجودة
- تفعيل/تعطيل rule

---

## Oracle Tables Overview

```
WORKER_MAIL_RULES           ← قواعد الإيميل (template, signature, from, subject suffix)
WORKER_MAIL_RECIPIENTS_V    ← View للمستلمين (يقرأ منها الـ worker)
WORKER_MAIL_RECIPIENTS      ← الجدول الفعلي (تكتب فيه)
```

**Rule lookup order** (من الـ worker):
1. `domain + reportCode + eventType + languageCode` — exact match
2. `domain + NULL (wildcard) + eventType + languageCode` — domain fallback

---

## Procedure

### Step 1 — Decide what rules you need

كل report محتاجة على الأقل rules:

| eventType | متى بتشتغل |
|-----------|-----------|
| `DATA` | لما الـ SQL query ترجع rows |
| `NO_DATA` | لما الـ SQL query ترجع صفر rows |

وكل rule ممكن تكون لـ:
- `EN` (الإنجليزية — default)
- `AR` (العربية)

---

### Step 2 — Insert the rules

```sql
-- ============================================================
-- DATA rule — English
-- ============================================================
INSERT INTO back_office.WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (
    <RULE_ID>,           -- unique number, e.g. 10
    '<domain>',          -- 'finance' | 'operations' | 'compliance'
    '<report-id>',       -- report id من report config, e.g. 'fin-settlement'
                         -- أو NULL لو عاوز wildcard لكل reports الـ domain
    'DATA',
    'EN',
    'Y',                 -- IS_ACTIVE
    'Y',                 -- NOTIFY_ENABLED
    NULL,                -- SUBJECT_SUFFIX (e.g. ' - Confirmed' أو NULL)
    'data_v1',           -- TEMPLATE_KEY من WORKER_MAIL_TEMPLATE_REGISTRY
    'default_v1',        -- SIGNATURE_KEY من WORKER_MAIL_SIGNATURE_REGISTRY
    'noreply@alahlypharos.com',  -- FROM_ADDRESS
    SYSTIMESTAMP,
    SYSTIMESTAMP
  );

-- ============================================================
-- NO_DATA rule — English
-- ============================================================
INSERT INTO back_office.WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (
    <RULE_ID + 1>,
    '<domain>',
    '<report-id>',
    'NO_DATA',
    'EN',
    'Y',
    'Y',
    ' - No Data',        -- subject suffix للـ NO_DATA
    'no_data_v1',        -- template مختلف للـ no data
    'default_v1',
    'noreply@alahlypharos.com',
    SYSTIMESTAMP,
    SYSTIMESTAMP
  );

COMMIT;
```

---

### Step 3 — Insert recipients

```sql
-- TO recipient لـ DATA rule
INSERT INTO back_office.WORKER_MAIL_RECIPIENTS
  (ID, RULE_ID, RECIPIENT_TYPE, EMAIL_ADDRESS, IS_ACTIVE, CREATED_AT)
VALUES
  (<REC_ID>, <DATA_RULE_ID>, 'TO', 'recipient@alahlypharos.com', 'Y', SYSTIMESTAMP);

-- CC recipient (اختياري)
INSERT INTO back_office.WORKER_MAIL_RECIPIENTS
  (ID, RULE_ID, RECIPIENT_TYPE, EMAIL_ADDRESS, IS_ACTIVE, CREATED_AT)
VALUES
  (<REC_ID+1>, <DATA_RULE_ID>, 'CC', 'manager@alahlypharos.com', 'Y', SYSTIMESTAMP);

-- نفس المستلمين لـ NO_DATA rule
INSERT INTO back_office.WORKER_MAIL_RECIPIENTS
  (ID, RULE_ID, RECIPIENT_TYPE, EMAIL_ADDRESS, IS_ACTIVE, CREATED_AT)
VALUES
  (<REC_ID+2>, <NODATA_RULE_ID>, 'TO', 'recipient@alahlypharos.com', 'Y', SYSTIMESTAMP);

COMMIT;
```

---

### Step 4 — Arabic version (اختياري)

لو محتاج إيميل عربي:

```sql
-- DATA rule — Arabic
INSERT INTO back_office.WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (<RULE_ID+2>, '<domain>', '<report-id>', 'DATA', 'AR',
   'Y', 'Y', NULL, 'data_v1', 'default_v1',
   'noreply@alahlypharos.com', SYSTIMESTAMP, SYSTIMESTAMP);

COMMIT;
```

> اللغة المستخدمة بتتحدد من `DEFAULT_EMAIL_LANGUAGE` في الـ `.env` أو من الـ rule query.

---

## Useful Queries

### عرض كل الـ rules الحالية

```sql
SELECT r.RULE_ID, r.DOMAIN, r.REPORT_CODE, r.EVENT_TYPE, r.LANGUAGE_CODE,
       r.IS_ACTIVE, r.TEMPLATE_KEY, r.SIGNATURE_KEY, r.FROM_ADDRESS,
       r.SUBJECT_SUFFIX
FROM back_office.WORKER_MAIL_RULES r
ORDER BY r.DOMAIN, r.REPORT_CODE, r.EVENT_TYPE;
```

### عرض المستلمين لـ rule معينة

```sql
SELECT rec.ID, rec.RULE_ID, rec.RECIPIENT_TYPE, rec.EMAIL_ADDRESS, rec.IS_ACTIVE
FROM back_office.WORKER_MAIL_RECIPIENTS rec
WHERE rec.RULE_ID = <RULE_ID>
ORDER BY rec.RECIPIENT_TYPE;
```

### إضافة مستلم لـ rule موجودة

```sql
INSERT INTO back_office.WORKER_MAIL_RECIPIENTS
  (ID, RULE_ID, RECIPIENT_TYPE, EMAIL_ADDRESS, IS_ACTIVE, CREATED_AT)
VALUES
  (<NEW_ID>, <RULE_ID>, 'TO', 'new.person@alahlypharos.com', 'Y', SYSTIMESTAMP);

COMMIT;
```

### تعطيل مستلم

```sql
UPDATE back_office.WORKER_MAIL_RECIPIENTS
SET IS_ACTIVE = 'N', UPDATED_AT = SYSTIMESTAMP
WHERE EMAIL_ADDRESS = 'old.person@alahlypharos.com'
  AND RULE_ID = <RULE_ID>;

COMMIT;
```

### تعطيل rule كاملة

```sql
UPDATE back_office.WORKER_MAIL_RULES
SET IS_ACTIVE = 'N', UPDATED_AT = SYSTIMESTAMP
WHERE RULE_ID = <RULE_ID>;

COMMIT;
```

---

## Template & Signature Keys Reference

### Templates (WORKER_MAIL_TEMPLATE_REGISTRY)

```sql
SELECT TEMPLATE_KEY, LANGUAGE_CODE, BODY_FILE, DIRECTION
FROM back_office.WORKER_MAIL_TEMPLATE_REGISTRY
WHERE IS_ACTIVE = 'Y'
ORDER BY TEMPLATE_KEY, LANGUAGE_CODE;
```

Standard keys:

| Key | الاستخدام |
|-----|-----------|
| `data_v1` | Standard DATA email |
| `no_data_v1` | Standard NO_DATA email |

### Signatures (WORKER_MAIL_SIGNATURE_REGISTRY)

```sql
SELECT SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE
FROM back_office.WORKER_MAIL_SIGNATURE_REGISTRY
WHERE IS_ACTIVE = 'Y'
ORDER BY SIGNATURE_KEY, LANGUAGE_CODE;
```

Standard keys:

| Key | الاستخدام |
|-----|-----------|
| `default_v1` | Al Ahly Pharos standard signature |

---

## Validation Checklist

- [ ] كل `TEMPLATE_KEY` موجود في `WORKER_MAIL_TEMPLATE_REGISTRY`
- [ ] كل `SIGNATURE_KEY` موجود في `WORKER_MAIL_SIGNATURE_REGISTRY`
- [ ] `IS_ACTIVE = 'Y'` في الـ rule والـ recipients
- [ ] فيه rule لكل من `DATA` و `NO_DATA`
- [ ] `REPORT_CODE` مطابق بالظبط لـ `id` في الـ report config
- [ ] `DOMAIN` مطابق بالظبط لـ `domain` في الـ domain index

## Common Errors

| Error | السبب | الحل |
|-------|-------|------|
| إيميل مش بيتبعت | `IS_ACTIVE = 'N'` أو rule مش موجودة | تحقق بالـ SELECT أعلاه |
| Template مش بيتـ load | `TEMPLATE_KEY` غلط أو مش موجود في registry | تحقق من `WORKER_MAIL_TEMPLATE_REGISTRY` |
| `to` recipients فاضية | Recipients مش مضافة أو `IS_ACTIVE = 'N'` | أضف records في `WORKER_MAIL_RECIPIENTS` |
| Rule مش بتتـ match | `REPORT_CODE` أو `DOMAIN` غلط | طابق بالظبط مع الـ report config |
