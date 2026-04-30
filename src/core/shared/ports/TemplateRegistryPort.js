/**
 * @typedef {Object} TemplateMeta
 * @property {string} templateKey - The lookup key (e.g., 'data_v1')
 * @property {string} languageCode - 'AR' | 'EN'
 * @property {string} bodyFile - Path to HTML body template (relative to src/)
 * @property {string} direction - 'LTR' | 'RTL'
 * @property {string|null} subjectTpl - Optional subject template with placeholders
 */

/**
 * @typedef {Object} TemplateLookupResult
 * @property {string} bodyFile - Path to HTML body template
 * @property {string} direction - 'LTR' | 'RTL' (defaults to 'LTR' if not set)
 * @property {string|null} subjectTpl - Optional subject template
 */

/**
 * @typedef {Object} TemplateRegistryPort
 *
 * @property {function(Object): Promise<TemplateLookupResult|null>} getTemplateFile
 *   Looks up the body template path and metadata for a given key + language.
 *   Returns null if not found or inactive.
 *
 *   @param {Object} options
 *   @param {string} options.templateKey - Template key (e.g., 'data_v1', 'no_data_v1')
 *   @param {string} options.languageCode - 'AR' | 'EN'
 *   @returns {Promise<TemplateLookupResult|null>}
 *
 * @property {function(): Promise<TemplateMeta[]>} getAllTemplates
 *   Returns metadata for all active templates (used for validation/debugging).
 *   @returns {Promise<TemplateMeta[]>}
 */

export {};
