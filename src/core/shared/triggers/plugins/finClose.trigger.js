/**
 * @fileoverview FIN_CLOSE Trigger Plugin.
 * Polls BO_OMNI_END_OF_DAY to detect finance day-close.
 * Used by reports with triggerType: 'FIN_CLOSE'.
 *
 * @implements {TriggerPlugin}
 */

import { getTodayAsNumber } from '../getTodayAsNumber.js';
import logger from '../../../../shared/logger/logger.js';

export class FinCloseTrigger {
  constructor(adapter, runStateAdapter) {
    this.type = 'FIN_CLOSE';
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
      meta: { source: 'BO_OMNI_END_OF_DAY' }
    }];
  }

  async claim(triggerId) {
    return await this.runState.claim(triggerId, this.type);
  }

  async markReady(triggerId, context = {}) {
    await this.runState.markReady(triggerId, this.type, context);
    logger.info('FIN_CLOSE marked READY', { triggerId });
  }

  async markDone(triggerId, execution = {}) {
    await this.runState.markDone(triggerId, this.type, execution);
    logger.info('FIN_CLOSE marked DONE', { triggerId });
  }

  async markPartial(triggerId, execution = {}) {
    await this.runState.markPartial(triggerId, this.type, execution);
    logger.warn('FIN_CLOSE marked PARTIAL', { triggerId });
  }

  async markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await this.runState.markFailed(triggerId, this.type, errorCode, errorMessage, execution);
    logger.error('FIN_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }
}
