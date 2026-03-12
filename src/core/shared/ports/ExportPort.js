/**
 * @typedef {Object} ExportPort
 * @property {function(Array<Object>, Object): Promise<string>} generate
 *   Generates a file (XLSX or CSV) from row data and report config.
 *   Returns the absolute file path of the generated file.
 *   @param {Array<Object>} rows - data rows from query
 *   @param {Object} config - report config { format, sheetName, fileName, outputDir }
 */
