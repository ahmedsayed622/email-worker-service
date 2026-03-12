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

export class CmpCloseTrigger {
  constructor(adapter, runStateAdapter) {
    this.type = 'CMP_CLOSE';
    this.adapter = adapter;
    this.runState = runStateAdapter;
  }

  async poll() {
    const today = getTodayAsNumber();
    const result = await this.adapter.getCloseDateIfClosed(today);
    if (!result) return [];

    const { closeDate, flag } = result;

    return [{
      triggerType: this.type,
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

  async claim(triggerId) {
    return await this.runState.claim(triggerId, this.type);
  }

  async markReady(triggerId, context = {}) {
    await this.runState.markReady(triggerId, this.type, context);
    logger.info('CMP_CLOSE marked READY', { triggerId });
  }

  async markDone(triggerId, execution = {}) {
    await this.runState.markDone(triggerId, this.type, execution);
    logger.info('CMP_CLOSE marked DONE', { triggerId });
  }

  async markPartial(triggerId, execution = {}) {
    await this.runState.markPartial(triggerId, this.type, execution);
    logger.warn('CMP_CLOSE marked PARTIAL', { triggerId });
  }

  async markFailed(triggerId, errorCode, errorMessage, execution = {}) {
    await this.runState.markFailed(triggerId, this.type, errorCode, errorMessage, execution);
    logger.error('CMP_CLOSE marked FAILED', { triggerId, errorCode, errorMessage });
  }
}
