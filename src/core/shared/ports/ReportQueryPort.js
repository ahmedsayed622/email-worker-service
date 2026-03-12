/**
 * @typedef {Object} ReportQueryPort
 * @property {function(string, Object): Promise<Array<Object>>} fetchData
 *   Reads a .sql file from disk, executes it against Oracle with bind params.
 *   Returns array of row objects.
 *   @param {string} sqlPath - relative path to .sql file (from project root, inside src/)
 *   @param {Object} params - bind variables, e.g. { close_date: '20260209' }
 */
