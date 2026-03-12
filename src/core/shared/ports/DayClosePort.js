/**
 * @deprecated Replaced by TriggerPort.js.
 * Each trigger plugin now encapsulates its own close-detection logic.
 * This port will be removed in a future version.
 *
 * @typedef {Object} DayClosePort
 * @property {function(): Promise<string|null>} getTodayCloseDateIfClosed
 *   Checks if END_OF_DAY table has a row for today's date.
 *   Returns today's date as YYYYMMDD string if exists, null otherwise.
 *   TODAY-only processing - prevents processing historical dates.
 */
