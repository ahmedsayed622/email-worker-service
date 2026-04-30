import { createXlsxAdapter } from './xlsx.adapter.js';
import { createCsvAdapter } from './csv.adapter.js';
import { AppError } from '../../shared/errors/AppError.js';

export function createExportAdapter() {
  const xlsx = createXlsxAdapter();
  const csv = createCsvAdapter();

  return {
    async generate(rows, config) {
      switch (config.format) {
        case 'xlsx':
          return xlsx.generate(rows, config);
        case 'csv':
          return csv.generate(rows, config);
        default:
          throw new AppError({
            code: 'EXPORT_FAILED',
            message: `Unsupported export format: '${config.format}'. Supported: xlsx, csv`,
            retryable: false,
          });
      }
    },

    async generateEmpty(config) {
      switch (config.format) {
        case 'xlsx':
          return xlsx.generateEmpty(config);
        case 'csv':
          return csv.generateEmpty(config);
        default:
          throw new AppError({
            code: 'EXPORT_FAILED',
            message: `Unsupported export format: '${config.format}'. Supported: xlsx, csv`,
            retryable: false,
          });
      }
    },
  };
}
