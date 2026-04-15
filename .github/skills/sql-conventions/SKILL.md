---
name: sql-conventions
description: "SQL file conventions for email-worker report queries. Use when: writing SQL query, creating SQL file, bind variables, Oracle SQL, close_date filter, :close_date, report SQL, avoid ORA-01036, SQL formatting rules, back_office schema prefix."
argument-hint: "<sqlFileName> — e.g. daily_settlement"
---

# SQL Conventions for email-worker

## When to Use
- بتكتب SQL query جديدة لـ report
- بتراجع SQL file موجود
- عندك `ORA-01036` أو مشكلة bind variables

---

## Rule 1 — File Location

```
src/core/<domain>/sql/<reportName>.sql
```

| Domain | Folder |
|--------|--------|
| finance | `src/core/finance/sql/` |
| operations | `src/core/operations/sql/` |
| compliance | `src/core/compliance/sql/` |
| domain جديد | `src/core/<domain>/sql/` |

لو الـ report ليها تقارير فرعية متعددة — احعل subfolder:
```
src/core/finance/sql/SettlementReports/
├── main.sql
├── by_profile.sql
└── totals.sql
```

---

## Rule 2 — No trailing semicolon

```sql
-- ✅ صح
SELECT * FROM back_office.MY_TABLE WHERE DATE_COL = :close_date

-- ❌ غلط
SELECT * FROM back_office.MY_TABLE WHERE DATE_COL = :close_date;
```

الـ adapter بيـ strip الـ semicolon تلقائياً، لكن تجنبه من البداية.

---

## Rule 3 — Always use back_office schema prefix

```sql
-- ✅ صح
SELECT * FROM back_office.BO_END_OF_DAY

-- ❌ غلط
SELECT * FROM BO_END_OF_DAY
```

---

## Rule 4 — Bind variable for date filter

الـ `:close_date` هو bind variable رسمي للتاريخ:
- نوعه `NUMBER` بصيغة `YYYYMMDD` (مش string)
- لازم يكون موجود في `requiredParams` في الـ report config

```sql
-- ✅ صح — NUMBER filter
WHERE INVOICE_DATE = :close_date

-- ✅ صح — لو الجدول بيحتفظ بـ DATE type
WHERE TRUNC(DATE_COLUMN) = TO_DATE(TO_CHAR(:close_date), 'YYYYMMDD')
```

**في الـ report config:**
```javascript
requiredParams: ['close_date'],   // ✅ لازم تكون موجودة
```

> لو SQL مش بتستخدم `:close_date`، حط `requiredParams: []`

---

## Rule 5 — No BOM in file

احفظ الملف بـ **UTF-8 بدون BOM**. الـ adapter بيعمل strip للـ BOM تلقائياً لكن تجنبه.

---

## Rule 6 — Header comment

في أول كل SQL file:

```sql
-- <Report Display Name>
-- Domain: <domain>
-- TriggerType: <TRIGGER_TYPE>
-- close_date: NUMBER (YYYYMMDD) — used as bind variable :close_date
-- Table: back_office.<TABLE_NAME>
```

---

## Rule 7 — Column naming

- **استخدم aliases** للأعمدة الكـ computed أو المكررة
- الـ aliases بتكون header الـ Excel/CSV مباشرةً

```sql
-- ✅ Column aliases تكون readable
SELECT
  PROFILE_ID,
  CUSTOMER_NAME_EN          AS "Customer Name",
  INVOICE_DATE              AS "Invoice Date",
  (QTY * UNIT_PRICE)        AS "Total Value",
  ...
```

---

## Rule 8 — Avoid bind false positives in comments

الـ adapter بيـ strip comments وstring literals قبل ما يدور على bind variables — لكن احتياطاً:
- متحطش `:variable_name` جوه تعليق
- متحطش `:variable_name` جوه string literal

```sql
-- ❌ ممكن يسبب مشكلة
-- :close_date is passed from worker

-- ✅ صح
-- close_date is passed from worker as bind variable
```

---

## Rule 9 — ORDER BY

دايماً حط `ORDER BY` لضمان ترتيب ثابت في الـ Excel output:

```sql
ORDER BY <DATE_COLUMN>, <ID_COLUMN>
```

---

## Rule 10 — Test locally first

قبل ما تضيف الـ SQL للـ worker، اختبرها في Oracle SQL Developer أو SQLcl:

```sql
-- في SQL Developer: استبدل :close_date بقيمة حقيقية
WHERE INVOICE_DATE = 20260415

-- من الـ worker: CLOSE_DATE بيجي NUMBER مش string
```

---

## Complete Example

```sql
-- Daily Settlement Report
-- Domain: finance
-- TriggerType: FIN_CLOSE
-- close_date: NUMBER (YYYYMMDD)
-- Table: back_office.SETTLEMENT_ORDERS

SELECT
  SETTLEMENT_ID             AS "Settlement ID",
  ACCOUNT_NUMBER            AS "Account No",
  CLIENT_NAME_EN            AS "Client Name",
  SETTLEMENT_DATE           AS "Settlement Date",
  AMOUNT                    AS "Amount",
  CURRENCY                  AS "Currency",
  STATUS                    AS "Status"
FROM back_office.SETTLEMENT_ORDERS
WHERE SETTLEMENT_DATE = :close_date
  AND STATUS IN ('SETTLED', 'CONFIRMED')
ORDER BY SETTLEMENT_DATE, ACCOUNT_NUMBER
```

---

## Quick Reference

| القاعدة | الصح | الغلط |
|---------|------|-------|
| Semicolon | بدون `;` في النهاية | `SELECT ...;` |
| Schema | `back_office.TABLE` | `TABLE` |
| Date filter | `:close_date` (NUMBER) | `':close_date'` أو string |
| File encoding | UTF-8 no BOM | UTF-8 BOM |
| Bind في comment | ممنوع | `:close_date` في comment |
