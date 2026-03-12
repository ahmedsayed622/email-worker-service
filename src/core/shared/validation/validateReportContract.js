/**
 * Report Contract Validation
 * 
 * Validates report config at bootstrap time to ensure:
 * 1. Required fields exist
 * 2. triggerType is registered
 * 3. requiredParams exist in SQL file
 * 4. format is valid ('xlsx' or 'csv')
 * 
 * This is fail-fast validation — any error stops the bootstrap process.
 * 
 * @module core/shared/validation/validateReportContract
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../../../shared/errors/AppError.js';
import logger from '../../../shared/logger/logger.js';

/**
 * Validate a single report config
 * 
 * @param {Object} report - Report configuration object
 * @param {Object} triggerRegistry - Trigger registry (has method to check if trigger type exists)
 * @param {string} projectRoot - Project root directory
 * @throws {AppError} If validation fails
 */
export async function validateReportContract(report, triggerRegistry, projectRoot) {
  const reportId = report?.id || 'UNKNOWN';

  // 1. Check required fields
  const requiredFields = ['id', 'sql', 'format', 'recipients', 'subject', 'triggerType'];
  const missing = requiredFields.filter((field) => !report?.[field]);

  if (missing.length > 0) {
    throw new AppError({
      code: 'INVALID_REPORT_CONFIG',
      message: `Report "${reportId}" missing required fields: ${missing.join(', ')}`,
      retryable: false,
      details: { reportId, missing, triggerType: report?.triggerType },
    });
  }

  // 2. Validate format
  if (!['xlsx', 'csv'].includes(report.format)) {
    throw new AppError({
      code: 'INVALID_REPORT_CONFIG',
      message: `Report "${reportId}" has invalid format: "${report.format}" (must be 'xlsx' or 'csv')`,
      retryable: false,
      details: { reportId, format: report.format, triggerType: report?.triggerType },
    });
  }

  // 3. Validate triggerType is registered
  if (!triggerRegistry.has(report.triggerType)) {
    const availableTypes = triggerRegistry.getAllTypes();
    throw new AppError({
      code: 'INVALID_REPORT_CONFIG',
      message: `Report "${reportId}" has unregistered triggerType: "${report.triggerType}". Available types: ${availableTypes.join(', ')}`,
      retryable: false,
      details: { reportId, triggerType: report?.triggerType, availableTypes },
    });
  }

  // 4. Validate requiredParams exist in SQL file
  if (report.requiredParams && Array.isArray(report.requiredParams) && report.requiredParams.length > 0) {
    await validateRequiredParamsInSQL(report, projectRoot);
  }

  logger.debug('Report contract validated', { reportId, triggerType: report.triggerType });
}

/**
 * Validate that all requiredParams exist in SQL file
 * 
 * @param {Object} report - Report configuration
 * @param {string} projectRoot - Project root directory
 * @throws {AppError} If validation fails
 */
async function validateRequiredParamsInSQL(report, projectRoot) {
  const reportId = report.id;
  const sqlPath = path.join(projectRoot, 'src', report.sql);

  let sqlContent;
  try {
    sqlContent = await readFile(sqlPath, 'utf8');
  } catch (err) {
    throw new AppError({
      code: 'INVALID_REPORT_CONFIG',
      message: `Report "${reportId}" SQL file not found: ${sqlPath}`,
      retryable: false,
      cause: err,
      details: { reportId, sqlPath, triggerType: report?.triggerType },
    });
  }

  // Remove comments and string literals (same logic as reportQuery.adapter.js)
  const sqlForScan = sqlContent
    .replace(/\/\*[\s\S]*?\*\//g, ' ') // Block comments
    .replace(/--.*$/gm, ' ') // Line comments
    .replace(/'[^']*'/g, ' '); // String literals

  // Check each required param
  for (const param of report.requiredParams) {
    const regex = new RegExp(`:${param}\\b`, 'i');
    if (!regex.test(sqlForScan)) {
      throw new AppError({
        code: 'INVALID_REPORT_CONFIG',
        message: `Report "${reportId}" requires param ":${param}" but it is missing in SQL file: ${report.sql}`,
        retryable: false,
        details: { reportId, missingParam: param, sqlPath: report.sql, triggerType: report?.triggerType },
      });
    }
  }

  logger.debug('Required params validated in SQL', {
    reportId,
    requiredParams: report.requiredParams,
    sqlPath: report.sql,
  });
}

/**
 * Validate all reports in a domain
 * 
 * @param {Object[]} reports - Array of report configs
 * @param {Object} triggerRegistry - Trigger registry
 * @param {string} projectRoot - Project root directory
 * @throws {AppError} If any validation fails
 */
export async function validateAllReports(reports, triggerRegistry, projectRoot) {
  for (const report of reports) {
    await validateReportContract(report, triggerRegistry, projectRoot);
  }
}
