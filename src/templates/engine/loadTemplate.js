import { readFile } from 'node:fs/promises';
import logger from '../../shared/logger/logger.js';

/**
 * Load template file content
 * 
 * @param {string} templatePath - Absolute path to template file
 * @returns {Promise<string>} Template content
 * @throws {Error} If template file cannot be read
 */
export async function loadTemplate(templatePath) {
  try {
    const content = await readFile(templatePath, 'utf8');
    return content;
  } catch (err) {
    logger.error('Failed to load template', {
      templatePath,
      error: err.message,
    });
    throw new Error(`Template load failed: ${templatePath}`);
  }
}
