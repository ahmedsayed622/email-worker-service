---
name: add-domain-trigger
description: "Add a completely new domain with its own trigger to the email-worker. Use when: new domain, new trigger type, new trigger plugin, new day-close event, extend worker with new business area, add trigger adapter, register trigger in bootstrap."
argument-hint: "<domainName> <TRIGGER_TYPE> — e.g. risk RISK_CLOSE"
---

# Add a New Domain with a New Trigger

## When to Use
- محتاج domain جديد خالص مش موجود (مثلاً: risk, treasury, settlement)
- الـ domain ده محتاج trigger جديد بيـ poll جدول Oracle مختلف
- بتضيف: DB adapter + trigger plugin + domain folder + reports + bootstrap registration

## Overview of Files to Create

```
src/adapters/db/triggers/<newDomain>Close.adapter.js   ← DB polling
src/core/shared/triggers/plugins/<newDomain>Close.trigger.js  ← Trigger plugin
src/core/<newDomain>/index.js                          ← Domain definition
src/core/<newDomain>/hooks.js                          ← Data processing hooks
src/core/<newDomain>/sql/<reportName>.sql              ← SQL query
src/core/<newDomain>/reports/<reportName>.report.js    ← Report config
```

**+ تعديل واحد:** `src/app/bootstrap.js`

---

## Procedure

### Step 1 — Create the DB trigger adapter

المكان: `src/adapters/db/triggers/<newDomain>Close.adapter.js`

```javascript
/**
 * @fileoverview DB adapter for <NewDomain> day-close trigger.
 * Reads from back_office.<YOUR_TABLE> to detect close event.
 */

import logger from '../../../shared/logger/logger.js';

/**
 * @param {import('oracledb').Pool} pool - Oracle connection pool
 * @returns {{ getCloseDateIfClosed: (today: number) => Promise<number|null> }}
 */
export function create<NewDomain>CloseAdapter(pool) {
  /**
   * Returns close_date as NUMBER (YYYYMMDD) if closed, or null.
   * @param {number} today - YYYYMMDD
   * @returns {Promise<number|null>}
   */
  async function getCloseDateIfClosed(today) {
    let conn;
    try {
      conn = await pool.getConnection();
      const result = await conn.execute(
        `SELECT <DATE_COLUMN> AS CLOSE_DATE
         FROM back_office.<YOUR_TABLE>
         WHERE <DATE_COLUMN> = :today
           AND ROWNUM = 1`,
        { today },
        { outFormat: 4002 }
      );

      if (result.rows && result.rows.length > 0) {
        const closeDate = Number(result.rows[0].CLOSE_DATE);
        logger.info('<NEW_DOMAIN>_CLOSE detected', { closeDate });
        return closeDate;
      }

      return null;
    } catch (err) {
      logger.error('<newDomain>CloseAdapter.getCloseDateIfClosed failed', {
        today,
        error: err.message,
      });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }

  return { getCloseDateIfClosed };
}
```

> **Pattern:** factory function (not a class). All other adapters in the codebase
> follow the same convention. No `this`, no `new` — dependencies are captured
> via closure.

---

### Step 2 — Create the trigger plugin

المكان: `src/core/shared/triggers/plugins/<newDomain>Close.trigger.js`

```javascript
/**
 * @fileoverview <TRIGGER_TYPE> Trigger Plugin.
 * Polls back_office.<YOUR_TABLE> to detect <newDomain> day-close.
 * Used by reports with triggerType: '<TRIGGER_TYPE>'.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

/**
 * @param {{ getCloseDateIfClosed: (today: number) => Promise<number|null> }} adapter
 * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
 * @returns {import('../../ports/TriggerPlugin.interface.js').TriggerPlugin}
 */
export function create<NewDomain>CloseTrigger(adapter, runStateAdapter) {
  const type = '<TRIGGER_TYPE>'; // e.g. 'RISK_CLOSE'

  async function poll() {
    const today = getTodayAsNumber();
    const closeDate = await adapter.getCloseDateIfClosed(today);
    if (!closeDate) return [];

    return [{
      triggerType: type,
      triggerId: String(closeDate),
      close_date: closeDate,
      meta: { source: 'back_office.<YOUR_TABLE>' },
    }];
  }

  async function claim(triggerId) {
    return await runStateAdapter.claim(triggerId, type);
  }

  async function markReady(triggerId, context = {}) {
    await runStateAdapter.markReady(triggerId, type, context);
    logger.info('<TRIGGER_TYPE> marked READY', { triggerId });
  }

  async function markDone(triggerId, execution = {}) {
    await runStateAdapter.markDone(triggerId, type, execution);
    logger.info('<TRIGGER_TYPE> marked DONE', { triggerId });
  }

  async function markPartial(triggerId, execution = {}) {
    await runStateAdapter.markPartial(triggerId, type, execution);
    logger.warn('<TRIGGER_TYPE> marked PARTIAL', { triggerId });
  }

  async function markFailed(triggerId, errorCode, errorMsg, details = {}) {
    await runStateAdapter.markFailed(triggerId, type, errorCode, errorMsg, details);
    logger.error('<TRIGGER_TYPE> marked FAILED', { triggerId, errorCode });
  }

  return { type, poll, claim, markReady, markDone, markPartial, markFailed };
}
```

> **Contract:** the returned object must match the `TriggerPlugin` typedef
> defined in `src/core/shared/ports/TriggerPlugin.interface.js`
> (`type`, `poll`, `claim`, `markReady`, `markDone`, `markPartial`, `markFailed`).

---

### Step 3 — Create the domain folder

#### `src/core/<newDomain>/index.js`
```javascript
import hooks from './hooks.js';

export default {
  domain: '<newDomain>',
  hooks,   // أو null لو مش محتاج processing
};
```

#### `src/core/<newDomain>/hooks.js`
```javascript
/**
 * Domain hooks for <newDomain>.
 * processData: runs after SQL fetch, before export.
 */
export default {
  /**
   * @param {Object[]} rows - Raw rows from Oracle
   * @param {number} closeDate - YYYYMMDD
   * @returns {Object[]} Processed rows
   */
  async processData(rows, closeDate) {
    // Custom calculations, derived columns, totals...
    return rows;
  },
};
```

> لو مش محتاج hooks، حط `hooks: null` في `index.js` وامسح `hooks.js`.

---

### Step 4 — Add SQL + report config

راجع [skill: add-report](../add-report/SKILL.md) للتفاصيل الكاملة.

ملخص سريع:
- SQL: `src/core/<newDomain>/sql/<reportName>.sql`
- Report config: `src/core/<newDomain>/reports/<reportName>.report.js` مع `triggerType: '<TRIGGER_TYPE>'`

---

### Step 5 — Register in bootstrap.js

افتح `src/app/bootstrap.js` وأضف:

**في الـ imports:**
```javascript
import { create<NewDomain>CloseTrigger } from '../core/shared/triggers/plugins/<newDomain>Close.trigger.js';
import { create<NewDomain>CloseAdapter } from '../adapters/db/triggers/<newDomain>Close.adapter.js';
```

**في جسم الـ `bootstrap()` function (بعد التريجرز الموجودة):**
```javascript
// NEW: <NewDomain> trigger
const <newDomain>CloseAdapter = create<NewDomain>CloseAdapter(pool);
triggerRegistry.register(create<NewDomain>CloseTrigger(<newDomain>CloseAdapter, runStateAdapter));
```

---

### Step 6 — Add mail rules in Oracle

راجع [skill: add-mail-rule](../add-mail-rule/SKILL.md) للـ SQL statements.

---

### Step 7 — Restart the worker

```bash
pm2 restart email-worker
# أو
sudo systemctl restart email-worker
```

---

## Validation Checklist

- [ ] DB adapter موجود في `src/adapters/db/triggers/` (factory function `createXxx`, **not a class**)
- [ ] Trigger plugin موجود في `src/core/shared/triggers/plugins/` (factory function `createXxx`, **not a class**)
- [ ] Plugin returns `{ type, poll, claim, markReady, markDone, markPartial, markFailed }`
- [ ] `type` في الـ plugin مطابق بالظبط لـ `triggerType` في الـ report configs
- [ ] Domain `index.js` export object بـ `{ domain, hooks }`
- [ ] Domain مُسَجَّل في `bootstrap.js` (import + register بالـ factory functions)
- [ ] SQL file + report config موجودين
- [ ] Mail rules موجودة في Oracle
- [ ] Worker أعاد التشغيل

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Trigger لا يُـclaim أي event | `getCloseDateIfClosed` بترجع null | تحقق من الـ Oracle table واسم العمود |
| Reports لا تشتغل مع الـ trigger | `triggerType` mismatch | تأكد إن `type` المُعرَّف في الـ plugin factory = `triggerType` في الـ report |
| `Cannot find module` عند startup | Import path غلط في bootstrap | راجع الـ import paths |
| Reports شغالة بس domain مش بيـ load | Domain مش في `src/core/` أو `index.js` export غلط | تأكد من الـ default export format |
