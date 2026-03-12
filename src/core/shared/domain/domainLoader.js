import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import logger from '../../../shared/logger/logger.js';
import { loadReports } from './reportLoader.js';

export async function loadDomains(coreDir) {
  const domains = [];

  let entries = [];
  try {
    entries = await readdir(coreDir, { withFileTypes: true });
  } catch (err) {
    logger.warn('Failed to read core directory', { coreDir, error: err.message });
    return domains;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === 'shared') continue;

    const dirPath = path.join(coreDir, entry.name);
    const indexPath = path.join(dirPath, 'index.js');

    try {
      const moduleUrl = pathToFileURL(indexPath).href;
      const mod = await import(moduleUrl);
      const def = mod?.default;
      if (!def || !def.domain) {
        logger.warn('Domain index.js missing default export or domain field', { dirPath });
        continue;
      }

      const reports = await loadReports(dirPath);
      domains.push({
        domain: def.domain,
        hooks: def.hooks ?? null,
        reports,
        dirPath,
      });
    } catch (err) {
      if (err?.code === 'ENOENT') {
        logger.warn('Domain index.js not found, skipping', { dirPath });
      } else {
        logger.warn('Failed to load domain', { dirPath, error: err.message });
      }
      continue;
    }
  }

  logger.info('Domains loaded', {
    count: domains.length,
    names: domains.map((d) => d.domain),
  });

  return domains;
}
