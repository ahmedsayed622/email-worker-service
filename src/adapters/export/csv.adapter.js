import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

function escapeCsv(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function createCsvAdapter() {
  return {
    async generate(rows, config) {
      try {
        const dataRows = Array.isArray(rows) ? rows : [];
        const headers = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

        const lines = [];
        if (headers.length > 0) {
          lines.push(headers.map(escapeCsv).join(','));
          for (const row of dataRows) {
            const line = headers.map((h) => escapeCsv(row[h])).join(',');
            lines.push(line);
          }
        }

        const csvContent = `\uFEFF${lines.join('\n')}`;
        const filePath = path.join(config.outputDir, config.fileName);
        await writeFile(filePath, csvContent, 'utf8');

        logger.info('CSV generated', { filePath, rowCount: dataRows.length });
        return filePath;
      } catch (err) {
        const appError = normalizeError(err, 'export');
        logger.error('CSV generation failed', { error: appError.message });
        throw appError;
      }
    },

    /**
     * Generate empty CSV file with optional headers (for exportWhenEmpty=true)
     * @param {Object} config
     * @param {string} config.fileName
     * @param {string} config.outputDir
     * @param {string[]} [config.headers]
     * @returns {Promise<string>} file path
     */
    async generateEmpty(config) {
      try {
        const headers = Array.isArray(config.headers) ? config.headers : [];
        const lines = [];
        if (headers.length > 0) {
          lines.push(headers.map(escapeCsv).join(','));
        }

        const csvContent = `\uFEFF${lines.join('\n')}`;
        const filePath = path.join(config.outputDir, config.fileName);
        await writeFile(filePath, csvContent, 'utf8');
        logger.info('Empty CSV generated', { filePath, headersCount: headers.length });
        return filePath;
      } catch (err) {
        const appError = normalizeError(err, 'export');
        logger.error('Empty CSV generation failed', { error: appError.message });
        throw appError;
      }
    },
  };
}
