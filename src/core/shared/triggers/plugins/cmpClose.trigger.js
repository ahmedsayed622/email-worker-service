/**
 * @fileoverview CMP_CLOSE Trigger Plugin.
 * Polls CMP_EMP_TBL_DAILY_ORDERS to detect if compliance data exists for today.
 * Used by reports with triggerType: 'CMP_CLOSE'.
 *
 * NOTE: Unlike OPS_CLOSE and FIN_CLOSE, this trigger fires when DATA EXISTS
 * for today's date, not when a close-event record is inserted.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

/**
 * @param {{ getCloseDateIfClosed: (today: number) => Promise<{closeDate: number, flag: number}|null> }} adapter
 * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
 * @returns {import('../TriggerPlugin.interface.js').TriggerPlugin}
 */
export function createCmpCloseTrigger(adapter, runStateAdapter) {
  const type = 'CMP_CLOSE';

  async function poll() {
    const today = getTodayAsNumber();
    const result = await adapter.getCloseDateIfClosed(today);
    if (!result) return [];

    const { closeDate, flag } = result;

    return [{
      triggerType: type,
      triggerId: String(closeDate),
      close_date: closeDate,
      flag: flag,
      meta: {
        source: 'CMP_EMP_TBL_DAILY_ORDERS',
        detection: 'data_existence',
        hasRealData: flag === 1
      }
    }];
  }

  async function claim(triggerId) {
    return await runStateAdapter.claim(triggerId, type);
  }

  async function markReady(triggerId, context = {}) {
    await runStateAdapter.markReady(triggerId, type, context);
    logger.info('CMP_CLOSE marked READY', { triggerId });
  }

  async function markDone(triggerId, execution = {}) {
    await runStateAdapter.markDone(triggerId, type, execution);
    logger.info('CMP_CLOSE marked DONE', { triggerId });
  }

  async function markPartial(triggerId, execution = {}) {
    await runStateAdapter.markPartial(triggerId, type, execution);
    logger.warn('CMP_CLOSE marked PARTIAL', { triggerId });
  }

  async function markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await runStateAdapter.markFailed(triggerId, type, errorCode, errorMessage, execution);
    logger.error('CMP_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }

  return { type, poll, claim, markReady, markDone, markPartial, markFailed };
}
