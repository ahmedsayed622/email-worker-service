/**
 * @typedef {Object} FileStorePort
 * @property {function(string, string): Promise<string>} ensureDayDir
 *   Creates directory structure for a specific close date and domain.
 *   @param {string} closeDate - The close date (YYYYMMDD)
 *   @param {string} domain - The domain name (finance, operations, etc.)
 *   @returns {Promise<string>} The created directory path
 * 
 * @property {function(string): Promise<string>} ensureDir
 *   Creates a directory at the specified path.
 *   @param {string} dirPath - The full directory path to create
 *   @returns {Promise<string>} The created directory path
 * 
 * @property {function(): string} getBasePath
 *   Returns the base output directory path.
 */
