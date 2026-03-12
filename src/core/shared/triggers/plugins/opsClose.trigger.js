/**
 * @fileoverview OPS_CLOSE Trigger Plugin.
 * Polls BO_END_OF_DAY to detect operations day-close.
 * Used by reports with triggerType: 'OPS_CLOSE'.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

export class OpsCloseTrigger {
  /**
   * @param {import('../../../../adapters/db/triggers/opsClose.adapter.js').OpsCloseAdapter} adapter
   * @param {import('../../../../adapters/db/runState.adapter.js')} runStateAdapter
   */
  constructor(adapter, runStateAdapter) {
    this.type = 'OPS_CLOSE';
    this.adapter = adapter;
    this.runState = runStateAdapter;
  }

  /**
   * Poll for ready events.
   * @returns {Promise<TriggerEvent[]>}
   */
  async poll() {
    const today = getTodayAsNumber();
    const closeDate = await this.adapter.getCloseDateIfClosed(today);

    if (!closeDate) return [];

    return [{
      triggerType: this.type,
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
  async claim(triggerId) {
    return await this.runState.claim(triggerId, this.type);
  }

  async markReady(triggerId, context = {}) {
    await this.runState.markReady(triggerId, this.type, context);
    logger.info('OPS_CLOSE marked READY', { triggerId });
  }

  /**
   * Mark event as successfully processed.
   * @param {string} triggerId
   */
  async markDone(triggerId, execution = {}) {
    await this.runState.markDone(triggerId, this.type, execution);
    logger.info('OPS_CLOSE marked DONE', { triggerId });
  }

  async markPartial(triggerId, execution = {}) {
    await this.runState.markPartial(triggerId, this.type, execution);
    logger.warn('OPS_CLOSE marked PARTIAL', { triggerId });
  }

  /**
   * Mark event as failed.
   * @param {string} triggerId
   * @param {string} errorCode
   * @param {string} errorMessage
   */
  async markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await this.runState.markFailed(triggerId, this.type, errorCode, errorMessage, execution);
    logger.error('OPS_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }
}
