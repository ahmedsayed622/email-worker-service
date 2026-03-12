import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

/**
 * Adapter for WORKER_MAIL_TEMPLATE_REGISTRY table
 * Retrieves email template metadata (file paths, direction) from database
 */
export function createTemplateRegistryAdapter() {
  return {
    /**
     * Get template file path and direction for a given template key and language
     * 
     * @param {Object} options
     * @param {string} options.templateKey - Template key (e.g., 'data_v1', 'no_data_v1')
     * @param {string} options.languageCode - Language code ('AR' or 'EN')
     * @returns {Promise<Object|null>} { bodyFile: string, direction: string, subjectTpl: string|null } or null if not found
     */
    async getTemplateFile({ templateKey, languageCode }) {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const sql = `
          SELECT BODY_FILE, DIRECTION, SUBJECT_TPL
          FROM back_office.WORKER_MAIL_TEMPLATE_REGISTRY
          WHERE TEMPLATE_KEY = :templateKey
            AND LANGUAGE_CODE = :languageCode
            AND IS_ACTIVE = 'Y'
        `;

        const result = await conn.execute(
          sql,
          { templateKey, languageCode },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const row = result.rows?.[0];
        if (!row) {
          logger.warn('Template not found in registry', { templateKey, languageCode });
          return null;
        }

        return {
          bodyFile: row.BODY_FILE,
          direction: row.DIRECTION || 'LTR',
          subjectTpl: row.SUBJECT_TPL || null,
        };
      } catch (err) {
        const appError = normalizeError(err, 'templateRegistry');
        logger.error('Template registry lookup failed', {
          templateKey,
          languageCode,
          error: appError.message,
        });
        throw appError;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (closeErr) {
            logger.warn('Failed to close Oracle connection', { error: closeErr.message });
          }
        }
      }
    },

    /**
     * Get all active templates (for validation/debugging)
     * 
     * @returns {Promise<Array>} Array of template metadata
     */
    async getAllTemplates() {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const sql = `
          SELECT TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, BODY_FILE, SUBJECT_TPL
          FROM back_office.WORKER_MAIL_TEMPLATE_REGISTRY
          WHERE IS_ACTIVE = 'Y'
          ORDER BY TEMPLATE_KEY, LANGUAGE_CODE
        `;

        const result = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        return result.rows.map((row) => ({
          templateKey: row.TEMPLATE_KEY,
          languageCode: row.LANGUAGE_CODE,
          direction: row.DIRECTION,
          bodyFile: row.BODY_FILE,
          subjectTpl: row.SUBJECT_TPL,
        }));
      } catch (err) {
        const appError = normalizeError(err, 'templateRegistry');
        logger.error('Failed to fetch all templates', { error: appError.message });
        throw appError;
      } finally {
        if (conn) {
          try {
            await conn.close();
          } catch (closeErr) {
            logger.warn('Failed to close Oracle connection', { error: closeErr.message });
          }
        }
      }
    },
  };
}
