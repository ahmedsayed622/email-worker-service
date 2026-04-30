/**
 * @typedef {Object} SignatureMeta
 * @property {string} signatureKey - The lookup key (e.g., 'default_v1')
 * @property {string} languageCode - 'AR' | 'EN'
 * @property {string} signatureFile - Path to HTML signature file (relative to src/)
 */

/**
 * @typedef {Object} SignatureLookupResult
 * @property {string} signatureFile - Path to HTML signature file
 */

/**
 * @typedef {Object} SignatureRegistryPort
 *
 * @property {function(Object): Promise<SignatureLookupResult|null>} getSignatureFile
 *   Looks up the signature file path for a given key + language.
 *   Returns null if not found or inactive.
 *
 *   @param {Object} options
 *   @param {string} options.signatureKey - Signature key (e.g., 'default_v1', 'manager_v1')
 *   @param {string} options.languageCode - 'AR' | 'EN'
 *   @returns {Promise<SignatureLookupResult|null>}
 *
 * @property {function(): Promise<SignatureMeta[]>} getAllSignatures
 *   Returns metadata for all active signatures (used for validation/debugging).
 *   @returns {Promise<SignatureMeta[]>}
 */

export {};
