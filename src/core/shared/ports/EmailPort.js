/**
 * @typedef {Object} EmailPort
 * @property {function(Object): Promise<void>} send
 *   Sends an email with optional attachments.
 *   @param {Object} options
 *   @param {string|string[]} options.to - recipient(s)
 *   @param {string} options.subject - email subject
 *   @param {string} options.body - HTML body
 *   @param {Array<{filename: string, path: string}>} [options.attachments] - file attachments
 */
