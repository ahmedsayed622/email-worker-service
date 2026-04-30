import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import logger from '../shared/logger/logger.js';
import { initPool, closePool } from '../adapters/db/oraclePool.js';
import { createRunStateAdapter } from '../adapters/db/runState.adapter.js';
import { createReportQueryAdapter } from '../adapters/db/reportQuery.adapter.js';
import { createMailRulesAdapter } from '../adapters/db/mailRules.adapter.js';
import { createTemplateRegistryAdapter } from '../adapters/db/templateRegistry.adapter.js';
import { createSignatureRegistryAdapter } from '../adapters/db/signatureRegistry.adapter.js';
import { createAuditAdapter } from '../adapters/db/audit.adapter.js';
import { createExportAdapter } from '../adapters/export/index.js';
import { createSmtpAdapter } from '../adapters/email/smtp.adapter.js';
import { createDryRunAdapter } from '../adapters/email/dryRun.adapter.js';
import { createFileStoreAdapter } from '../adapters/fs/fileStore.js';
import { loadDomains } from '../core/shared/domain/domainLoader.js';
import { createExecuteReports } from '../core/shared/usecases/executeReports.js';

// NEW: Trigger system imports
import * as triggerRegistry from '../core/shared/triggers/triggerRegistry.js';
import { OpsCloseTrigger } from '../core/shared/triggers/plugins/opsClose.trigger.js';
import { FinCloseTrigger } from '../core/shared/triggers/plugins/finClose.trigger.js';
import { CmpCloseTrigger } from '../core/shared/triggers/plugins/cmpClose.trigger.js';
import { CmpMonthStartTrigger } from '../core/shared/triggers/plugins/cmpMonthStart.trigger.js';
import { createCmpMonthStartAdapter } from '../adapters/db/triggers/cmpMonthStart.adapter.js';
import { createOpsCloseAdapter } from '../adapters/db/triggers/opsClose.adapter.js';
import { createFinCloseAdapter } from '../adapters/db/triggers/finClose.adapter.js';
import { createCmpCloseAdapter } from '../adapters/db/triggers/cmpClose.adapter.js';

// NEW: Validation imports
import { validateReportContract } from '../core/shared/validation/validateReportContract.js';

export async function bootstrap() {
  logger.info('Bootstrap starting', { nodeEnv: env.NODE_ENV, isDryRun: env.isDryRun });

  const pool = await initPool();

  // Create run state adapter (shared by all triggers)
  const runStateAdapter = createRunStateAdapter(env.MAX_RETRY_ATTEMPTS);

  // NEW: Create trigger DB adapters
  const opsCloseAdapter = createOpsCloseAdapter(pool);
  const finCloseAdapter = createFinCloseAdapter(pool);
  const cmpCloseAdapter = createCmpCloseAdapter(pool);

  // NEW: Create and register trigger plugins
  triggerRegistry.register(new OpsCloseTrigger(opsCloseAdapter, runStateAdapter));
  triggerRegistry.register(new FinCloseTrigger(finCloseAdapter, runStateAdapter));
  triggerRegistry.register(new CmpCloseTrigger(cmpCloseAdapter, runStateAdapter));

  // CMP_MONTH_START: polls CMP_CLIENTS_TBL_CTRL_DOB — same pattern as CMP_CLOSE
  const cmpMonthStartAdapter = createCmpMonthStartAdapter(pool);
  triggerRegistry.register(new CmpMonthStartTrigger(cmpMonthStartAdapter, runStateAdapter));

  logger.info('Triggers registered', {
    count: triggerRegistry.getAll().length,
    types: triggerRegistry.getAllTypes(),
  });

  // Create other ports
  const reportQueryPort = createReportQueryAdapter();
  const mailRulesPort = createMailRulesAdapter();
  const templateRegistryPort = createTemplateRegistryAdapter();
  const signatureRegistryPort = createSignatureRegistryAdapter();
  const auditPort = createAuditAdapter();
  const exportPort = createExportAdapter();
  const fileStorePort = createFileStoreAdapter(env.REPORTS_OUTPUT_DIR);

  let emailPort;
  if (env.isDryRun) {
    emailPort = createDryRunAdapter();
    logger.info('Email adapter: DRY-RUN mode (SMTP not configured)');
  } else {
    const transportConfig = {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
      from: env.SMTP_FROM,
    };

    if (env.SMTP_ALLOW_INSECURE) {
      transportConfig.tls = { rejectUnauthorized: false };
      logger.warn('SMTP running in INSECURE TLS mode (rejectUnauthorized=false)');
    }

    emailPort = createSmtpAdapter(transportConfig);
    logger.info('Email adapter: SMTP mode', { host: env.SMTP_HOST, port: env.SMTP_PORT });
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const coreDir = path.resolve(__dirname, '../core');
  const projectRoot = path.resolve(__dirname, '../..');

  const domains = await loadDomains(coreDir);

  // NEW: Flatten all reports from domains (for easier filtering by triggerType)
  const allReports = [];
  for (const domain of domains) {
    for (const report of domain.reports) {
      // Add domain info to report for context
      report.domain = domain.domain;
      report.hooks = domain.hooks;
      allReports.push(report);
    }
  }

  const totalReports = allReports.length;
  if (domains.length === 0 || totalReports === 0) {
    logger.error('Bootstrap failed: no domains/reports loaded', {
      domainsCount: domains.length,
      reportsCount: totalReports,
    });
    throw new Error('No domains or reports found');
  }

  logger.info('Loaded domains and reports', {
    domainsCount: domains.length,
    reportsCount: totalReports,
    reportsByTrigger: allReports.reduce((acc, r) => {
      acc[r.triggerType || 'unknown'] = (acc[r.triggerType || 'unknown'] || 0) + 1;
      return acc;
    }, {}),
  });

  // Validation phase
  let hasErrors = false;

  // Existing validation + NEW enhanced validation
  for (const report of allReports) {
    // 1. SQL file existence check
    const sqlFullPath = path.join(projectRoot, 'src', report.sql);
    if (!existsSync(sqlFullPath)) {
      logger.error('Missing SQL file', {
        reportId: report.id,
        sqlPath: report.sql,
        resolved: sqlFullPath,
      });
      hasErrors = true;
    }

    // 2. Report contract validation (triggerType, requiredParams, format)
    try {
      await validateReportContract(report, triggerRegistry, projectRoot);
    } catch (err) {
      logger.error('Report contract validation failed', {
        reportId: report.id,
        error: err.message,
      });
      hasErrors = true;
    }
  }

  if (hasErrors) {
    throw new Error('Startup validation failed — check logs for details');
  }

  await runStateAdapter.recoverStuckRuns(env.STALE_TIMEOUT_MIN);
  logger.info('Crash recovery completed');

  // NEW: Create generic executeReports (replaces executeDayClose)
  const executeReports = createExecuteReports(
    { reportQueryPort, exportPort, emailPort, auditPort, runStatePort: runStateAdapter, fileStorePort, mailRulesPort, templateRegistryPort, signatureRegistryPort },
    {
      maxRetryAttempts: env.MAX_RETRY_ATTEMPTS,
      adminEmail: env.ADMIN_EMAIL,
      notifyOnFailure: env.NOTIFY_ON_FAILURE,
      reportsOutputDir: env.REPORTS_OUTPUT_DIR,
    }
  );

  async function cleanup() {
    logger.info('Shutting down...');
    await closePool();
    logger.info('Shutdown complete');
  }

  logger.info('Bootstrap complete', {
    domainsCount: domains.length,
    reportsCount: allReports.length,
    reportsByTrigger: allReports.reduce((acc, r) => {
      acc[r.triggerType] = (acc[r.triggerType] || 0) + 1;
      return acc;
    }, {}),
    triggers: triggerRegistry.getAllTypes(),
    isDryRun: env.isDryRun,
  });

  return {
    pool,
    allReports, // NEW: Flat list of all reports
    executeReports, // NEW: Generic runner
    triggerRegistry, // NEW: Trigger registry
    cleanup,
  };
}
