/**
 * @fileoverview MONTH_START Trigger Plugin.
 * Fires on the 1st day of each month — no DB polling required.
 * Computes month_start_mmdd and month_end_mmdd for SQL bind params.
 * Used by reports with triggerType: 'MONTH_START'.
 *
 * @implements {TriggerPlugin}
 */

import logger from '../../../../shared/logger/logger.js';

export class MonthStartTrigger {
  /**
   * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
   */
  constructor(runStateAdapter) {
    this.type = 'MONTH_START';
    this.runState = runStateAdapter;
  }

  /**
   * Poll — fires only on the 1st day of the month.
   * No DB query needed; decision is purely date-based.
   * @returns {Promise<TriggerEvent[]>}
   */
  async poll() {
    const today = new Date();

    if (today.getDate() !== 1) return [];

    const year = today.getFullYear();
    const month = today.getMonth() + 1; // 1-12
    const lastDay = new Date(year, month, 0).getDate(); // 28 / 29 / 30 / 31

    // close_date = first day of month as YYYYMMDD NUMBER (e.g. 20260401)
    const close_date = year * 10000 + month * 100 + 1;

    // triggerId = YYYYMM — prevents duplicate runs in the same month
    const triggerId = `${year}${String(month).padStart(2, '0')}`;

    // MMDD as NUMBER — e.g. April → 401 .. 430
    const month_start_mmdd = month * 100 + 1;
    const month_end_mmdd = month * 100 + lastDay;

    logger.info('MONTH_START detected', {
      triggerId,
      close_date,
      month,
      year,
      lastDay,
      month_start_mmdd,
      month_end_mmdd,
    });

    return [{
      triggerType: this.type,
      triggerId,
      close_date,
      month_start_mmdd,
      month_end_mmdd,
      meta: {
        source: 'date_check',
        year,
        month,
        lastDay,
      },
    }];
  }

  /**
   * Attempt to claim the event (prevents re-processing same month).
   * @param {string} triggerId - YYYYMM format
   */
  async claim(triggerId) {
    return await this.runState.claim(triggerId, this.type);
  }

  async markReady(triggerId, context = {}) {
    await this.runState.markReady(triggerId, this.type, context);
    logger.info('MONTH_START marked READY', { triggerId });
  }

  async markDone(triggerId, execution = {}) {
    await this.runState.markDone(triggerId, this.type, execution);
    logger.info('MONTH_START marked DONE', { triggerId });
  }

  async markPartial(triggerId, execution = {}) {
    await this.runState.markPartial(triggerId, this.type, execution);
    logger.warn('MONTH_START marked PARTIAL', { triggerId });
  }

  async markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await this.runState.markFailed(triggerId, this.type, errorCode, errorMessage, execution);
    logger.error('MONTH_START marked FAILED', { triggerId, errorCode, errorMessage });
  }
}
