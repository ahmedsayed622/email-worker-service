import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import logger from '../../shared/logger/logger.js';
import { AppError } from '../../shared/errors/AppError.js';

export function createFileStoreAdapter(baseOutputDir) {
  return {
    async ensureDayDir(closeDate, domain) {
      const dirPath = path.join(baseOutputDir, closeDate, domain);
      try {
        logger.info('Creating directory', { closeDate, domain, dirPath });
        await mkdir(dirPath, { recursive: true });
        logger.debug('Directory ensured', { dirPath });
        return dirPath;
      } catch (err) {
        logger.error('Failed to create directory', { 
          dirPath, 
          closeDate,
          domain,
          error: err.message,
          stack: err.stack,
          code: 'FS_MKDIR_FAILED'
        });
        throw new AppError({
          code: 'FS_MKDIR_FAILED',
          message: `Failed to create directory: ${dirPath}`,
          retryable: false,
          cause: err,
        });
      }
    },
    async ensureDir(dirPath) {
      try {
        logger.info('Creating directory', { dirPath });
        await mkdir(dirPath, { recursive: true });
        logger.debug('Directory ensured', { dirPath });
        return dirPath;
      } catch (err) {
        logger.error('Failed to create directory', { 
          dirPath, 
          error: err.message,
          stack: err.stack,
          code: 'FS_MKDIR_FAILED'
        });
        throw new AppError({
          code: 'FS_MKDIR_FAILED',
          message: `Failed to create directory: ${dirPath}`,
          retryable: false,
          cause: err,
        });
      }
    },
    getBasePath() {
      return baseOutputDir;
    },
  };
}
