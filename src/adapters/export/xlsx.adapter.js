import ExcelJS from 'exceljs';
import path from 'node:path';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

export function createXlsxAdapter() {
  return {
    async generate(rows, config) {
      try {
        const workbook = new ExcelJS.Workbook();
        const sheetName = config.sheetName || 'Sheet1';
        const worksheet = workbook.addWorksheet(sheetName);

        const dataRows = Array.isArray(rows) ? rows : [];
        const headers = dataRows.length > 0 ? Object.keys(dataRows[0]) : [];

        if (headers.length > 0) {
          const headerRow = worksheet.addRow(headers);
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4472C4' },
            };
          });

          dataRows.forEach((row) => {
            worksheet.addRow(headers.map((h) => row[h]));
          });

          worksheet.columns.forEach((column, index) => {
            const header = headers[index] || '';
            let maxLen = String(header).length;
            column.eachCell({ includeEmpty: true }, (cell) => {
              const val = cell.value ?? '';
              const len = String(val).length;
              if (len > maxLen) maxLen = len;
            });
            column.width = Math.max(10, Math.min(50, maxLen + 2));
          });
        }

        worksheet.views = [{ state: 'frozen', ySplit: 1 }];

        const filePath = path.join(config.outputDir, config.fileName);
        logger.info('Writing XLSX file', { 
          outputDir: config.outputDir, 
          fileName: config.fileName, 
          filePath,
          rowCount: dataRows.length 
        });
        await workbook.xlsx.writeFile(filePath);
        logger.info('XLSX generated', { filePath, rowCount: dataRows.length });
        return filePath;
      } catch (err) {
        const appError = normalizeError(err, 'export');
        logger.error('XLSX generation failed', { 
          error: appError.message, 
          stack: err.stack,
          outputDir: config.outputDir,
          fileName: config.fileName,
          code: 'FS_WRITE_FAILED'
        });
        throw appError;
      }
    },

    /**
     * Generate empty XLSX file with headers only
     * Used for finance reports with exportWhenEmpty=true
     * 
     * @param {Object} config - Configuration
     * @param {string} config.sheetName - Sheet name
     * @param {string} config.fileName - File name
     * @param {string} config.outputDir - Output directory
     * @param {string[]} [config.headers] - Column headers (optional)
     * @returns {Promise<string>} File path
     */
    async generateEmpty(config) {
      try {
        const workbook = new ExcelJS.Workbook();
        const sheetName = config.sheetName || 'Sheet1';
        const worksheet = workbook.addWorksheet(sheetName);

        // Add headers if provided
        if (config.headers && config.headers.length > 0) {
          const headerRow = worksheet.addRow(config.headers);
          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF4472C4' },
            };
          });

          // Auto-size columns based on header length
          worksheet.columns.forEach((column, index) => {
            const header = config.headers[index] || '';
            const maxLen = String(header).length;
            column.width = Math.max(10, Math.min(50, maxLen + 2));
          });

          worksheet.views = [{ state: 'frozen', ySplit: 1 }];
        }

        const filePath = path.join(config.outputDir, config.fileName);
        logger.info('Writing empty XLSX file', {
          outputDir: config.outputDir,
          fileName: config.fileName,
          filePath,
          headersCount: config.headers?.length || 0,
        });
        await workbook.xlsx.writeFile(filePath);
        logger.info('Empty XLSX generated', { filePath });
        return filePath;
      } catch (err) {
        const appError = normalizeError(err, 'export');
        logger.error('Empty XLSX generation failed', {
          error: appError.message,
          stack: err.stack,
          outputDir: config.outputDir,
          fileName: config.fileName,
          code: 'FS_WRITE_FAILED',
        });
        throw appError;
      }
    },
  };
}
