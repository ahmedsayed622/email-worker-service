/**
 * @fileoverview CMP_MONTH_START Trigger Plugin.
 * Polls CMP_CLIENTS_TBL_CTRL_DOB to detect if the monthly DOB procedure
 * has run for today (inserted by Oracle Scheduler on the 1st of each month).
 * Used by reports with triggerType: 'CMP_MONTH_START'.
 *
 * Follows the same pattern as CMP_CLOSE trigger — DB is the source of truth.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

/**
 * @param {{ getPendingTrigger: (today: number) => Promise<{closeDate: number, flag: number}|null> }} adapter
 * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
 * @returns {import('../../ports/TriggerPlugin.interface.js').TriggerPlugin}
 */
export function createCmpMonthStartTrigger(adapter, runStateAdapter) {
  const type = 'CMP_MONTH_START';

  /**
   * Poll for pending monthly trigger.
   * @returns {Promise<TriggerEvent[]>}
   */
  async function poll() {
    const today = getTodayAsNumber();
    const result = await adapter.getPendingTrigger(today);

    if (!result) return [];

    const { closeDate, flag } = result;
    const triggerId = String(closeDate).slice(0, 6); // YYYYMM

    return [{
      triggerType: type,
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
  async function claim(triggerId) {
    return await runStateAdapter.claim(triggerId, type);
  }

  async function markReady(triggerId, context = {}) {
    await runStateAdapter.markReady(triggerId, type, context);
    logger.info('CMP_MONTH_START marked READY', { triggerId });
  }

  async function markDone(triggerId, execution = {}) {
    await runStateAdapter.markDone(triggerId, type, execution);
    logger.info('CMP_MONTH_START marked DONE', { triggerId });
  }

  async function markPartial(triggerId, execution = {}) {
    await runStateAdapter.markPartial(triggerId, type, execution);
    logger.warn('CMP_MONTH_START marked PARTIAL', { triggerId });
  }

  async function markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await runStateAdapter.markFailed(triggerId, type, errorCode, errorMessage, execution);
    logger.error('CMP_MONTH_START marked FAILED', { triggerId, errorCode, errorMessage });
  }

  return { type, poll, claim, markReady, markDone, markPartial, markFailed };
}
