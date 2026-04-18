/**
 * @fileoverview MONTH_START Trigger Plugin.
 * Polls CMP_CLIENTS_TBL_CTRL_DOB to detect if the monthly DOB procedure
 * has run for today (inserted by Oracle Scheduler on the 1st of each month).
 * Used by reports with triggerType: 'MONTH_START'.
 *
 * Follows the same pattern as CMP_CLOSE trigger — DB is the source of truth.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

export class MonthStartTrigger {
  /**
   * @param {import('../../../../adapters/db/triggers/monthStart.adapter.js').MonthStartAdapter} adapter
   * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
   */
  constructor(adapter, runStateAdapter) {
    this.type = 'MONTH_START';
    this.adapter = adapter;
    this.runState = runStateAdapter;
  }

  /**
   * Poll for pending monthly trigger.
   * @returns {Promise<TriggerEvent[]>}
   */
  async poll() {
    const today = getTodayAsNumber();
    const result = await this.adapter.getPendingTrigger(today);

    if (!result) return [];

    const { closeDate, flag } = result;
    const triggerId = String(closeDate).slice(0, 6); // YYYYMM

    return [{
      triggerType: this.type,
      triggerId,
      close_date: closeDate,
      flag,
      meta: {
        source: 'CMP_CLIENTS_TBL_CTRL_DOB',
        hasRealData: flag === 1,
      },
    }];
  }

  /**
   * Attempt to claim the event for processing.
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
