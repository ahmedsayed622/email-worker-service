import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

/**
 * Adapter for WORKER_MAIL_SIGNATURE_REGISTRY table
 * Retrieves signature file paths from database
 */
export function createSignatureRegistryAdapter() {
  return {
    /**
     * Get signature file path for a given signature key and language
     * 
     * @param {Object} options
     * @param {string} options.signatureKey - Signature key (e.g., 'default_v1', 'manager_v1')
     * @param {string} options.languageCode - Language code ('AR' or 'EN')
     * @returns {Promise<Object|null>} { signatureFile: string } or null if not found
     */
    async getSignatureFile({ signatureKey, languageCode }) {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const sql = `
          SELECT SIGNATURE_FILE
          FROM back_office.WORKER_MAIL_SIGNATURE_REGISTRY
          WHERE SIGNATURE_KEY = :signatureKey
            AND LANGUAGE_CODE = :languageCode
            AND IS_ACTIVE = 'Y'
        `;

        const result = await conn.execute(
          sql,
          { signatureKey, languageCode },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const row = result.rows?.[0];
        if (!row) {
          logger.warn('Signature not found in registry', { signatureKey, languageCode });
          return null;
        }

        return {
          signatureFile: row.SIGNATURE_FILE,
        };
      } catch (err) {
        const appError = normalizeError(err, 'signatureRegistry');
        logger.error('Signature registry lookup failed', {
          signatureKey,
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
     * Get all active signatures (for validation/debugging)
     * 
     * @returns {Promise<Array>} Array of signature metadata
     */
    async getAllSignatures() {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const sql = `
          SELECT SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE
          FROM back_office.WORKER_MAIL_SIGNATURE_REGISTRY
          WHERE IS_ACTIVE = 'Y'
          ORDER BY SIGNATURE_KEY, LANGUAGE_CODE
        `;

        const result = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });

        return result.rows.map((row) => ({
          signatureKey: row.SIGNATURE_KEY,
          languageCode: row.LANGUAGE_CODE,
          signatureFile: row.SIGNATURE_FILE,
        }));
      } catch (err) {
        const appError = normalizeError(err, 'signatureRegistry');
        logger.error('Failed to fetch all signatures', { error: appError.message });
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
