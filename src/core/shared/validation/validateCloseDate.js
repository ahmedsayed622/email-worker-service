/**
 * Close Date Validation
 * 
 * Validates that close_date parameter is in correct YYYYMMDD format.
 * 
 * Rules:
 * - Must be 8 digits
 * - Year: 2020-2030 (configurable)
 * - Month: 01-12
 * - Day: 01-31
 * 
 * @module core/shared/validation/validateCloseDate
 */

import { AppError } from '../../../shared/errors/AppError.js';

/**
 * Validate close_date format and bounds
 * 
 * @param {number|string} closeDate - Close date in YYYYMMDD format
 * @param {Object} [options] - Validation options
 * @param {number} [options.minYear=2020] - Minimum allowed year
 * @param {number} [options.maxYear=2030] - Maximum allowed year
 * @throws {AppError} If validation fails
 * @returns {number} Validated close_date as NUMBER
 */
export function validateCloseDate(closeDate, options = {}) {
  const { minYear = 2020, maxYear = 2030 } = options;

  // Convert to string for parsing
  const closeDateStr = String(closeDate);

  // Check length
  if (closeDateStr.length !== 8) {
    throw new AppError(
      'INVALID_CLOSE_DATE',
      `Close date must be 8 digits (YYYYMMDD), got: ${closeDateStr} (length: ${closeDateStr.length})`
    );
  }

  // Check numeric
  if (!/^\d{8}$/.test(closeDateStr)) {
    throw new AppError('INVALID_CLOSE_DATE', `Close date must contain only digits, got: ${closeDateStr}`);
  }

  // Parse components
  const year = parseInt(closeDateStr.slice(0, 4), 10);
  const month = parseInt(closeDateStr.slice(4, 6), 10);
  const day = parseInt(closeDateStr.slice(6, 8), 10);

  // Validate year
  if (year < minYear || year > maxYear) {
    throw new AppError(
      'INVALID_CLOSE_DATE',
      `Year must be between ${minYear} and ${maxYear}, got: ${year} (close_date: ${closeDateStr})`
    );
  }

  // Validate month
  if (month < 1 || month > 12) {
    throw new AppError('INVALID_CLOSE_DATE', `Month must be between 01 and 12, got: ${month} (close_date: ${closeDateStr})`);
  }

  // Validate day
  if (day < 1 || day > 31) {
    throw new AppError('INVALID_CLOSE_DATE', `Day must be between 01 and 31, got: ${day} (close_date: ${closeDateStr})`);
  }

  // Additional date validation (check if date is valid)
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new AppError('INVALID_CLOSE_DATE', `Invalid date: ${closeDateStr} (e.g., Feb 30 does not exist)`);
  }

  // Return as NUMBER
  return Number(closeDateStr);
}

/**
 * Validate close_date without throwing (returns error message instead)
 * 
 * @param {number|string} closeDate - Close date in YYYYMMDD format
 * @param {Object} [options] - Validation options
 * @returns {{valid: boolean, error?: string, value?: number}} Validation result
 */
export function validateCloseDateSafe(closeDate, options = {}) {
  try {
    const value = validateCloseDate(closeDate, options);
    return { valid: true, value };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}
