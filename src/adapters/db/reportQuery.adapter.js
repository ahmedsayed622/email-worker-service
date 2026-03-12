import oracledb from 'oracledb';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../../shared/logger/logger.js';
import { normalizeError } from '../../shared/errors/normalizeError.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../..');

// One-time initialization logging
logger.info('ReportQueryAdapter init', {
  __filename,
  __dirname,
  PROJECT_ROOT,
  cwd: process.cwd(),
  platform: process.platform,
});

export function createReportQueryAdapter() {
  return {
    async fetchData(sqlPath, params = {}, meta = {}) {
      let conn;
      let absolutePath;
      try {
        // Normalize path separators for cross-platform compatibility
        const normalizedSqlPath = String(sqlPath).replace(/[\\/]+/g, path.sep);
        absolutePath = path.resolve(PROJECT_ROOT, 'src', normalizedSqlPath);
        
        logger.info('Reading SQL file', {
          reportId: meta?.reportId,
          domain: meta?.domain,
          sqlPath,
          normalizedSqlPath,
          absolutePath,
        });
        
        let sql = await readFile(absolutePath, 'utf8');
        
        // Sanitize SQL: remove UTF-8 BOM and trailing semicolons
        sql = sql.replace(/^\uFEFF/, '');
        sql = sql.replace(/[;\s]+$/g, '');
        
        // Remove comments and string literals before scanning for bind placeholders to avoid false positives
        // (e.g., "-- Bind variable :close_date" in comments should not trigger bind detection)
        const sqlForBindScan = sql
          .replace(/\/\*[\s\S]*?\*\//g, ' ')  // Remove /* ... */ block comments
          .replace(/--.*$/gm, ' ')             // Remove -- ... line comments
          .replace(/'[^']*'/g, ' ');           // Remove '...' string literals
        
        // Extract placeholders from SQL and filter binds to avoid ORA-01036
        const matches = sqlForBindScan.match(/:\w+/g) || [];
        const placeholders = Array.from(new Set(matches.map(x => x.slice(1))));
        const inputKeys = Object.keys(params || {});
        const filteredParams = {};
        for (const k of inputKeys) {
          if (placeholders.includes(k)) {
            // Convert close_date from string (YYYYMMDD) to Number for Oracle numeric columns
            const value = params[k];
            filteredParams[k] = (k === 'close_date' && typeof value === 'string' && /^\d+$/.test(value))
              ? Number(value)
              : value;
          }
        }
        
        logger.info('DB execute', {
          reportId: meta?.reportId,
          domain: meta?.domain,
          triggerType: meta?.triggerType,
          placeholders,
          bindKeysProvided: inputKeys,
          bindKeysSent: Object.keys(filteredParams),
        });

        conn = await oracledb.getPool('emailWorker').getConnection();
        
        // NEW: Performance tracking
        const startTime = Date.now();
        const result = await conn.execute(sql, filteredParams);
        const durationMs = Date.now() - startTime;
        
        logger.info('Report query executed', {
          reportId: meta?.reportId,
          domain: meta?.domain,
          triggerType: meta?.triggerType,
          rowCount: result.rows?.length || 0,
          durationMs, // NEW: Query execution time
          sqlPath,
          rowCount: result.rows?.length || 0,
        });
        
        return result.rows || [];
      } catch (err) {
        const appError = normalizeError(err, 'reportQuery');
        logger.error('Report query failed', {
          reportId: meta?.reportId,
          domain: meta?.domain,
          triggerType: meta?.triggerType,
          sqlPath,
          absolutePath,
          error: appError.message,
          oracleCode: err?.errorNum,
          oracleSqlState: err?.sqlState,
          stack: err?.stack,
        });

        // Also print to console for immediate visibility in runtimes that only show stdout
        console.error('[ReportQuery][FAILED]', {
          reportId: meta?.reportId,
          triggerType: meta?.triggerType,
          sqlPath,
          error: appError.message,
          oracleCode: err?.errorNum,
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
  };
}
