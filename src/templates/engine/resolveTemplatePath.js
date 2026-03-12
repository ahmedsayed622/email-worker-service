import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { access } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const templatesRoot = path.resolve(__dirname, '..');

/**
 * Check if a file exists
 * @param {string} filePath - Absolute file path
 * @returns {Promise<boolean>}
 */
async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve template path with fallback hierarchy
 * 
 * @param {Object} options
 * @param {string} options.domain - Domain name (e.g., 'finance', 'operations')
 * @param {string} options.reportCode - Report code (e.g., 'fin-daily-confirmation')
 * @param {string} options.eventType - Event type: 'DATA' or 'NO_DATA'
 * @param {string} options.languageCode - Language code: 'AR' or 'EN'
 * @returns {Promise<string|null>} Resolved template path or null if not found
 */
export async function resolveTemplatePath({ domain, reportCode, eventType, languageCode }) {
  // Normalize inputs
  const event = eventType === 'DATA' ? 'data' : 'no_data';
  const lang = languageCode === 'EN' ? 'en' : 'ar';

  // Try paths in order:
  // 1. Domain-specific report template
  const domainReportPath = path.join(
    templatesRoot,
    'domains',
    domain,
    'reports',
    reportCode,
    `${event}.${lang}.html`
  );
  if (await fileExists(domainReportPath)) {
    return domainReportPath;
  }

  // 2. Shared email template
  const sharedPath = path.join(
    templatesRoot,
    'shared',
    'emails',
    `${event}.${lang}.html`
  );
  if (await fileExists(sharedPath)) {
    return sharedPath;
  }

  return null;
}

/**
 * Resolve signature template path with fallback hierarchy
 * 
 * @param {Object} options
 * @param {string} options.domain - Domain name
 * @param {string} options.languageCode - Language code: 'AR' or 'EN'
 * @param {string} [options.signatureKey='default'] - Signature key (e.g., 'default', 'manager')
 * @returns {Promise<string|null>} Resolved signature path or null if not found
 */
export async function resolveSignaturePath({ domain, languageCode, signatureKey = 'default' }) {
  const lang = languageCode === 'EN' ? 'en' : 'ar';

  // Try paths in order:
  // 1. Domain-specific signature
  const domainSigPath = path.join(
    templatesRoot,
    'domains',
    domain,
    'signatures',
    lang,
    `${signatureKey}.html`
  );
  if (await fileExists(domainSigPath)) {
    return domainSigPath;
  }

  // 2. Shared signature with key
  const sharedSigPath = path.join(
    templatesRoot,
    'shared',
    'signatures',
    lang,
    `${signatureKey}.html`
  );
  if (await fileExists(sharedSigPath)) {
    return sharedSigPath;
  }

  // 3. Shared default signature
  const defaultSigPath = path.join(
    templatesRoot,
    'shared',
    'signatures',
    lang,
    'default.html'
  );
  if (await fileExists(defaultSigPath)) {
    return defaultSigPath;
  }

  return null;
}
