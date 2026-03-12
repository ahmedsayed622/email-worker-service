import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import logger from '../../../shared/logger/logger.js';

function getFirstExport(mod) {
  const entries = Object.entries(mod || {}).filter(([key]) => key !== 'default');
  if (entries.length > 0) return entries[0][1];
  return mod?.default;
}

function validateReportConfig(report, fileName) {
  const required = ['id', 'sql', 'format', 'recipients', 'subject'];
  const missing = required.filter((key) => report?.[key] === undefined || report?.[key] === null || report?.[key] === '');
  if (missing.length > 0) {
    logger.warn('Report config missing required fields', { fileName, missing });
    return false;
  }
  return true;
}

export async function loadReports(domainDirPath) {
  const reportsDir = path.join(domainDirPath, 'reports');
  let entries = [];

  try {
    entries = await readdir(reportsDir, { withFileTypes: true });
  } catch (err) {
    if (err?.code === 'ENOENT') {
      logger.debug('Reports directory not found', { reportsDir });
      return [];
    }
    logger.warn('Failed to read reports directory', { reportsDir, error: err.message });
    return [];
  }

  const reportFiles = entries
    .filter((e) => e.isFile() && e.name.endsWith('.report.js'))
    .map((e) => path.join(reportsDir, e.name));

  const results = [];
  for (const filePath of reportFiles) {
    const fileName = path.basename(filePath);
    try {
      const mod = await import(pathToFileURL(filePath).href);
      const report = getFirstExport(mod);

      if (!report || !validateReportConfig(report, fileName)) continue;
      if (report.enabled === false) continue;
      // NEW: Accept any trigger type - filtering happens in worker by triggerType
      // Old behavior: only accepted trigger: 'day-close'
      // Backward compatibility: if old 'trigger' field exists without 'triggerType', auto-map
      if (!report.triggerType && report.trigger) {
        logger.warn('Report using deprecated "trigger" field - please update to "triggerType"', {
          fileName,
          reportId: report.id,
          oldTrigger: report.trigger,
        });
        // Auto-map for backward compatibility (will be removed in future versions)
        if (report.trigger === 'day-close') {
          report.triggerType = 'FIN_CLOSE'; // Default day-close → FIN_CLOSE
        }
      }

      results.push(report);
    } catch (err) {
      logger.warn('Failed to load report config', { fileName, error: err.message });
      continue;
    }
  }

  return results;
}
