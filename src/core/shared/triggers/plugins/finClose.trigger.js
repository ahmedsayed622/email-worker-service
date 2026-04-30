/**
 * @fileoverview FIN_CLOSE Trigger Plugin.
 * Polls BO_OMNI_END_OF_DAY to detect finance day-close.
 * Used by reports with triggerType: 'FIN_CLOSE'.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

/**
 * @param {{ getCloseDateIfClosed: (today: number) => Promise<number|null> }} adapter
 * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
 * @returns {import('../TriggerPlugin.interface.js').TriggerPlugin}
 */
export function createFinCloseTrigger(adapter, runStateAdapter) {
  const type = 'FIN_CLOSE';

  async function poll() {
    const today = getTodayAsNumber();
    const closeDate = await adapter.getCloseDateIfClosed(today);
    if (!closeDate) return [];

    return [{
      triggerType: type,
      triggerId: String(closeDate),
      close_date: closeDate,
      meta: { source: 'BO_OMNI_END_OF_DAY' }
    }];
  }

  async function claim(triggerId) {
    return await runStateAdapter.claim(triggerId, type);
  }

  async function markReady(triggerId, context = {}) {
    await runStateAdapter.markReady(triggerId, type, context);
    logger.info('FIN_CLOSE marked READY', { triggerId });
  }

  async function markDone(triggerId, execution = {}) {
    await runStateAdapter.markDone(triggerId, type, execution);
    logger.info('FIN_CLOSE marked DONE', { triggerId });
  }

  async function markPartial(triggerId, execution = {}) {
    await runStateAdapter.markPartial(triggerId, type, execution);
    logger.warn('FIN_CLOSE marked PARTIAL', { triggerId });
  }

  async function markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await runStateAdapter.markFailed(triggerId, type, errorCode, errorMessage, execution);
    logger.error('FIN_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }

  return { type, poll, claim, markReady, markDone, markPartial, markFailed };
}
