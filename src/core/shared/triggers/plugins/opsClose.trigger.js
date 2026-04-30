/**
 * @fileoverview OPS_CLOSE Trigger Plugin.
 * Polls BO_END_OF_DAY to detect operations day-close.
 * Used by reports with triggerType: 'OPS_CLOSE'.
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
export function createOpsCloseTrigger(adapter, runStateAdapter) {
  const type = 'OPS_CLOSE';

  /**
   * Poll for ready events.
   * @returns {Promise<TriggerEvent[]>}
   */
  async function poll() {
    const today = getTodayAsNumber();
    const closeDate = await adapter.getCloseDateIfClosed(today);

    if (!closeDate) return [];

    return [{
      triggerType: type,
      triggerId: String(closeDate),
      close_date: closeDate,
      meta: { source: 'BO_END_OF_DAY' }
    }];
  }

  /**
   * Attempt to claim an event for processing.
   * @param {string} triggerId
   * @returns {Promise<{proceed: boolean, mode: string, failedReports?: string[]}>}
   */
  async function claim(triggerId) {
    return await runStateAdapter.claim(triggerId, type);
  }

  async function markReady(triggerId, context = {}) {
    await runStateAdapter.markReady(triggerId, type, context);
    logger.info('OPS_CLOSE marked READY', { triggerId });
  }

  /**
   * Mark event as successfully processed.
   * @param {string} triggerId
   */
  async function markDone(triggerId, execution = {}) {
    await runStateAdapter.markDone(triggerId, type, execution);
    logger.info('OPS_CLOSE marked DONE', { triggerId });
  }

  async function markPartial(triggerId, execution = {}) {
    await runStateAdapter.markPartial(triggerId, type, execution);
    logger.warn('OPS_CLOSE marked PARTIAL', { triggerId });
  }

  /**
   * Mark event as failed.
   * @param {string} triggerId
   * @param {string} errorCode
   * @param {string} errorMessage
   */
  async function markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await runStateAdapter.markFailed(triggerId, type, errorCode, errorMessage, execution);
    logger.error('OPS_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }

  return { type, poll, claim, markReady, markDone, markPartial, markFailed };
}
