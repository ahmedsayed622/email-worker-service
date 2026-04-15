---
name: add-domain-trigger
description: "Add a completely new domain with its own trigger to the email-worker. Use when: new domain, new trigger type, new trigger plugin, new day-close event, extend worker with new business area, add trigger adapter, register trigger in bootstrap, new trigger class."
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

export class <NewDomain>CloseAdapter {
  /**
   * @param {import('oracledb').Pool} pool
   */
  constructor(pool) {
    this.pool = pool;
  }

  /**
   * Returns close_date as NUMBER (YYYYMMDD) if closed, or null.
   * @param {number} today - YYYYMMDD
   * @returns {Promise<number|null>}
   */
  async getCloseDateIfClosed(today) {
    let conn;
    try {
      conn = await this.pool.getConnection();
      const result = await conn.execute(
        `SELECT <DATE_COLUMN> AS CLOSE_DATE
         FROM back_office.<YOUR_TABLE>
         WHERE <DATE_COLUMN> = :today
           AND ROWNUM = 1`,
        { today },
        { outFormat: 4002 }
      );

      if (result.rows && result.rows.length > 0) {
        const closeDate = result.rows[0].CLOSE_DATE;
        logger.info('<NEW_DOMAIN>_CLOSE detected', { closeDate });
        return closeDate;
      }

      return null;
    } catch (err) {
      logger.error('<NewDomain>CloseAdapter.getCloseDateIfClosed failed', {
        today,
        error: err.message,
      });
      throw err;
    } finally {
      if (conn) await conn.close();
    }
  }
}
```

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

export class <NewDomain>CloseTrigger {
  /**
   * @param {import('../../../../adapters/db/triggers/<newDomain>Close.adapter.js').<NewDomain>CloseAdapter} adapter
   * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
   */
  constructor(adapter, runStateAdapter) {
    this.type = '<TRIGGER_TYPE>';   // e.g. 'RISK_CLOSE'
    this.adapter = adapter;
    this.runState = runStateAdapter;
  }

  async poll() {
    const today = getTodayAsNumber();
    const closeDate = await this.adapter.getCloseDateIfClosed(today);
    if (!closeDate) return [];

    return [{
      triggerType: this.type,
      triggerId: String(closeDate),
      close_date: closeDate,
      meta: { source: 'back_office.<YOUR_TABLE>' },
    }];
  }

  async claim(triggerId) {
    return await this.runState.claim(triggerId, this.type);
  }

  async markReady(triggerId, context = {}) {
    await this.runState.markReady(triggerId, this.type, context);
    logger.info('<TRIGGER_TYPE> marked READY', { triggerId });
  }

  async markDone(triggerId, execution = {}) {
    await this.runState.markDone(triggerId, this.type, execution);
    logger.info('<TRIGGER_TYPE> marked DONE', { triggerId });
  }

  async markFailed(triggerId, errorCode, errorMsg, details = {}) {
    await this.runState.markFailed(triggerId, this.type, errorCode, errorMsg, details);
    logger.error('<TRIGGER_TYPE> marked FAILED', { triggerId, errorCode });
  }
}
```

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
import { <NewDomain>CloseTrigger } from '../core/shared/triggers/plugins/<newDomain>Close.trigger.js';
import { <NewDomain>CloseAdapter } from '../adapters/db/triggers/<newDomain>Close.adapter.js';
```

**في جسم الـ `bootstrap()` function (بعد التريجرز الموجودة):**
```javascript
// NEW: <NewDomain> trigger
const <newDomain>CloseAdapter = new <NewDomain>CloseAdapter(pool);
triggerRegistry.register(new <NewDomain>CloseTrigger(<newDomain>CloseAdapter, runStateAdapter));
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

- [ ] DB adapter موجود في `src/adapters/db/triggers/`
- [ ] Trigger plugin موجود في `src/core/shared/triggers/plugins/`
- [ ] `this.type` في الـ plugin مطابق بالظبط لـ `triggerType` في الـ report configs
- [ ] Domain `index.js` export object بـ `{ domain, hooks }`
- [ ] Domain مُسجَّل في `bootstrap.js` (import + register)
- [ ] SQL file + report config موجودين
- [ ] Mail rules موجودة في Oracle
- [ ] Worker أعاد التشغيل

## Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Trigger لا يُـclaim أي event | `getCloseDateIfClosed` بترجع null | تحقق من الـ Oracle table واسم العمود |
| Reports لا تشتغل مع الـ trigger | `triggerType` mismatch | تأكد إن `this.type` في الـ plugin = `triggerType` في الـ report |
| `Cannot find module` عند startup | Import path غلط في bootstrap | راجع الـ import paths |
| Reports شغالة بس domain مش بيـ load | Domain مش في `src/core/` أو `index.js` export غلط | تأكد من الـ default export format |
