import logger from '../../shared/logger/logger.js';
import { resolveSignaturePath } from './resolveTemplatePath.js';
import { loadTemplate } from './loadTemplate.js';
import { renderTemplate } from './renderTemplate.js';
import { loadSignatureWithInlineImages } from '../../core/shared/domain/emailTemplates/signatures/signatureLoader.js';
import { resolveSubject } from '../../core/shared/domain/reportNaming.js';
import { createTemplateRegistryAdapter } from '../../adapters/db/templateRegistry.adapter.js';
import { createSignatureRegistryAdapter } from '../../adapters/db/signatureRegistry.adapter.js';

/**
 * Render complete email (subject, from, html body) using database-driven templates
 * 
 * @param {Object} options
 * @param {Object} options.rule - Mail rule from WORKER_MAIL_RULES
 * @param {string} options.rule.fromAddress - From email address (nullable)
 * @param {string} options.rule.subjectSuffix - Subject suffix (nullable)
 * @param {string} options.rule.templateKey - Template key (e.g., 'data_v1', 'no_data_v1')
 * @param {string} options.rule.signatureKey - Signature key (e.g., 'default_v1')
 * @param {string} options.rule.languageCode - Language code ('AR' or 'EN')
 * @param {Object} options.context - Template context
 * @param {string} options.context.domain - Domain name
 * @param {string} options.context.reportCode - Report code
 * @param {string} options.context.reportName - Report display name
 * @param {string|number} options.context.closeDate - Close date
 * @param {string} options.context.eventType - 'DATA' or 'NO_DATA'
 * @param {string} options.context.languageCode - 'AR' or 'EN'
 * @param {number} [options.context.rowCount] - Row count (for DATA emails)
 * @param {string} [options.context.fileName] - File name (for DATA emails)
 * @param {Object} options.report - Report definition (for fallback subject)
 * @param {string} [options.defaultFrom] - Default from address if rule doesn't specify
 * @returns {Promise<Object>} { from: string, subject: string, html: string }
 */
export async function renderEmail({ rule, context, report, defaultFrom }) {
  const templateRegistry = createTemplateRegistryAdapter();
  const signatureRegistry = createSignatureRegistryAdapter();

  const {
    domain,
    reportCode,
    reportName,
    closeDate,
    eventType,
    languageCode,
    rowCount,
    fileName,
  } = context;

  // 1. Resolve FROM address
  const from = rule.fromAddress || defaultFrom || 'noreply@alahlypharos.com';

  // 2. Build SUBJECT
  // Use report.subject with closeDate substitution, then append rule suffix
  const baseSubject = report?.subject
    ? resolveSubject(report.subject, closeDate)
    : `Report ${reportName} - ${closeDate}`;
  const subject = rule.subjectSuffix
    ? `${baseSubject}${rule.subjectSuffix}`
    : baseSubject;

  // 3. Get signature file path from registry and load with inlined images
  const signatureKey = rule.signatureKey || 'default_v1';
  const signatureInfo = await signatureRegistry.getSignatureFile({
    signatureKey,
    languageCode: rule.languageCode || languageCode,
  });

  if (!signatureInfo) {
    logger.error('Signature not found in registry', {
      signatureKey,
      languageCode: rule.languageCode || languageCode,
    });
    throw new Error(`Signature not found in registry: ${signatureKey}/${rule.languageCode || languageCode}`);
  }

  const companySignatureHtml = await loadSignatureWithInlineImages(signatureInfo.signatureFile);

  // 4. Resolve and load signature wrapper template
  const signaturePath = await resolveSignaturePath({
    domain,
    languageCode: rule.languageCode || languageCode,
    signatureKey: 'default', // Wrapper template (ar/default.html or en/default.html)
  });

  if (!signaturePath) {
    logger.error('Signature wrapper template not found', {
      domain,
      languageCode: rule.languageCode || languageCode,
    });
    throw new Error(`Signature wrapper template not found: ${domain}/${rule.languageCode || languageCode}/default`);
  }

  const signatureTemplate = await loadTemplate(signaturePath);
  const signatureHtml = renderTemplate(signatureTemplate, {
    signatureHtml: companySignatureHtml, // Use raw {{{signatureHtml}}}
  });

  // 5. Get email template file path from registry
  const templateKey = rule.templateKey || (eventType === 'DATA' ? 'data_v1' : 'no_data_v1');
  const templateInfo = await templateRegistry.getTemplateFile({
    templateKey,
    languageCode: rule.languageCode || languageCode,
  });

  if (!templateInfo) {
    logger.error('Template not found in registry', {
      templateKey,
      languageCode: rule.languageCode || languageCode,
    });
    throw new Error(`Template not found in registry: ${templateKey}/${rule.languageCode || languageCode}`);
  }

  // 6. Load email template from database-registered path
  const emailTemplate = await loadTemplate(templateInfo.bodyFile);

  // 7. Render email body with context + signature
  const html = renderTemplate(emailTemplate, {
    reportName,
    closeDate,
    rowCount: rowCount ?? '—',
    fileName: fileName ?? '',
    domain,
    reportCode,
    signatureHtml, // Inject rendered signature (raw)
  });

  logger.info('Email rendered successfully (DB-driven)', {
    domain,
    reportCode,
    eventType,
    languageCode,
    templateKey,
    signatureKey,
    from,
    subject,
  });

  return { from, subject, html };
}
