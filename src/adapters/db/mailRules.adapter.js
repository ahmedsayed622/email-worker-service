import oracledb from 'oracledb';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

export function createMailRulesAdapter() {
  return {
    async getRule({ domain, reportCode, eventType, languageCode = 'EN' }) {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const constraints = "IS_ACTIVE = 'Y' AND NOTIFY_ENABLED = 'Y'";
        const exactSql = `
          SELECT RULE_ID, SUBJECT_SUFFIX, FROM_ADDRESS, TEMPLATE_KEY, SIGNATURE_KEY, LANGUAGE_CODE
          FROM back_office.WORKER_MAIL_RULES
          WHERE ${constraints}
            AND DOMAIN = :domain
            AND REPORT_CODE = :reportCode
            AND EVENT_TYPE = :eventType
            AND LANGUAGE_CODE = :languageCode
        `;

        const fallbackSql = `
          SELECT RULE_ID, SUBJECT_SUFFIX, FROM_ADDRESS, TEMPLATE_KEY, SIGNATURE_KEY, LANGUAGE_CODE
          FROM back_office.WORKER_MAIL_RULES
          WHERE ${constraints}
            AND DOMAIN = :domain
            AND REPORT_CODE IS NULL
            AND EVENT_TYPE = :eventType
            AND LANGUAGE_CODE = :languageCode
        `;

        let result = await conn.execute(exactSql, { domain, reportCode, eventType, languageCode }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        let row = result.rows?.[0];

        if (!row) {
          result = await conn.execute(fallbackSql, { domain, eventType, languageCode }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
          row = result.rows?.[0];
        }

        if (!row) return null;

        return {
          ruleId: row.RULE_ID,
          subjectSuffix: row.SUBJECT_SUFFIX || '',
          fromAddress: row.FROM_ADDRESS || null,
          templateKey: row.TEMPLATE_KEY || null,
          signatureKey: row.SIGNATURE_KEY || null,
          languageCode: row.LANGUAGE_CODE || 'AR', // Default to Arabic
        };
      } catch (err) {
        const appError = normalizeError(err, 'mailRules');
        logger.error('Mail rule lookup failed', { domain, reportCode, eventType, languageCode, error: appError.message });
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

    async getRecipients(ruleId) {
      let conn;
      try {
        conn = await oracledb.getPool('emailWorker').getConnection();

        const sql = `
          SELECT EMAIL_ADDRESS, RECIP_TYPE, SOURCE_KIND
          FROM back_office.WORKER_MAIL_RECIPIENTS_V
          WHERE RULE_ID = :ruleId
        `;

        const result = await conn.execute(sql, { ruleId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const to = (result.rows || [])
          .filter((row) => row.RECIP_TYPE === 'TO')
          .map((row) => row.EMAIL_ADDRESS)
          .filter(Boolean);

        return { to };
      } catch (err) {
        const appError = normalizeError(err, 'mailRecipients');
        logger.error('Mail recipients lookup failed', { ruleId, error: appError.message });
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
