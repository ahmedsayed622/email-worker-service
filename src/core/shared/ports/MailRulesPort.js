/**
 * @typedef {Object} MailRule
 * @property {number} ruleId - Primary key from WORKER_MAIL_RULES
 * @property {string} subjectSuffix - Optional text appended to email subject (empty string if none)
 * @property {string|null} fromAddress - Override sender address; null = use default
 * @property {string|null} templateKey - Lookup key for WORKER_MAIL_TEMPLATE_REGISTRY
 * @property {string|null} signatureKey - Lookup key for WORKER_MAIL_SIGNATURE_REGISTRY
 * @property {string} languageCode - 'AR' | 'EN'
 */

/**
 * @typedef {Object} MailRecipients
 * @property {string[]} to - List of TO recipient email addresses (active only)
 */

/**
 * @typedef {Object} MailRulesPort
 *
 * @property {function(Object): Promise<MailRule|null>} getRule
 *   Looks up a mail rule by domain + report + event + language with fallback.
 *   Lookup order:
 *     1. Exact match: domain + reportCode + eventType + languageCode
 *     2. Domain wildcard: domain + REPORT_CODE IS NULL + eventType + languageCode
 *
 *   @param {Object} options
 *   @param {string} options.domain - 'finance' | 'operations' | 'compliance'
 *   @param {string} options.reportCode - report id (matches report.id)
 *   @param {string} options.eventType - 'DATA' | 'NO_DATA'
 *   @param {string} [options.languageCode='EN'] - 'AR' | 'EN'
 *   @returns {Promise<MailRule|null>} The matching rule or null if none found
 *
 * @property {function(number): Promise<MailRecipients>} getRecipients
 *   Fetches the recipient list for a rule from WORKER_MAIL_RECIPIENTS_V.
 *
 *   @param {number} ruleId - Primary key from WORKER_MAIL_RULES
 *   @returns {Promise<MailRecipients>} { to: string[] } — empty array if no recipients
 */

export {};
