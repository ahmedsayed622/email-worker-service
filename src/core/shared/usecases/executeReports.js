/**
 * Execute Reports Use Case
 * 
 * Generic report execution runner for any trigger type.
 * Replaces executeDayClose.js with multi-trigger support.
 * 
 * Changes from executeDayClose:
 * - Generic signature: executeReports(eventContext, reports, mode, failedReports, ports, config)
 * - eventContext contains: { triggerType, triggerId, close_date, meta }
 * - exportWhenEmpty logic: creates empty files with headers for finance compliance
 * - All references to closeDate replaced with eventContext.close_date
 * 
 * @module core/shared/usecases/executeReports
 */

import logger from '../../../shared/logger/logger.js';
import { normalizeError } from '../../../shared/errors/normalizeError.js';
import { resolveFileName, buildOutputDir, buildCustomOutputDir } from '../domain/reportNaming.js';
import { renderEmail } from '../../../templates/engine/renderEmail.js';

function buildAdminNotificationBody(eventContext, failedList, summary) {
  const summaryObj = typeof summary === 'string' ? JSON.parse(summary) : summary;
  const rows = failedList
    .map((f) => {
      const retryable = f.retryable ? 'نعم' : 'لا';
      return `
        <tr>
          <td>${f.reportId}</td>
          <td>${f.errorCode}</td>
          <td>${retryable}</td>
        </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تنبيه التقارير</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background:#f5f7fa; color:#1f2a37; }
    .wrap { max-width: 720px; margin: 24px auto; background:#fff; border-radius:8px; overflow:hidden; box-shadow:0 6px 20px rgba(0,0,0,0.08); }
    .header { background:#8a1c1c; color:#fff; padding:16px 20px; font-weight:600; }
    .content { padding:20px; line-height:1.8; }
    table { width:100%; border-collapse:collapse; margin-top:12px; font-size:14px; }
    th, td { border:1px solid #e5e7eb; padding:8px 10px; text-align:right; }
    th { background:#f0f4f8; }
    .note { margin-top:12px; color:#374151; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">تنبيه - فشل تقارير</div>
    <div class="content">
      <p>نوع التشغيل: <strong>${eventContext.triggerType}</strong></p>
      <p>تاريخ الإغلاق: <strong>${eventContext.close_date}</strong></p>
      <p>الملخص: إجمالي ${summaryObj.total} | ناجح ${summaryObj.done} | فاشل ${summaryObj.failed} | متجاوز ${summaryObj.skipped}</p>
      <table>
        <thead>
          <tr>
            <th>معرف التقرير</th>
            <th>رمز الخطأ</th>
            <th>قابل لإعادة المحاولة</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <p class="note">التقارير المعلمة كـ non-retryable تحتاج تدخل يدوي.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Create executeReports use case
 * 
 * @param {Object} ports - Infrastructure ports
 * @param {Object} ports.reportQueryPort - SQL execution port
 * @param {Object} ports.exportPort - File export port
 * @param {Object} ports.emailPort - Email sending port
 * @param {Object} ports.auditPort - Audit logging port
 * @param {Object} ports.fileStorePort - Filesystem operations port
 * @param {Object} config - Configuration
 * @param {number} config.maxRetryAttempts - Maximum retry attempts
 * @param {string} config.reportsOutputDir - Default reports output directory
 * @param {string} [config.adminEmail] - Admin email for failure notifications
 * @param {boolean} [config.notifyOnFailure] - Whether to send failure notifications
 * @returns {Function} executeReports function
 */
export function createExecuteReports(ports, config) {
  /**
   * Execute reports for a trigger event
   * 
   * @param {Object} eventContext - Trigger event context
   * @param {string} eventContext.triggerType - Trigger type (e.g., 'FIN_CLOSE', 'OPS_CLOSE')
   * @param {string} eventContext.triggerId - Unique trigger identifier
   * @param {number} eventContext.close_date - Close date as NUMBER (YYYYMMDD)
   * @param {Object} [eventContext.meta] - Additional metadata
   * @param {Object[]} reports - Reports to execute (already filtered by trigger type)
   * @param {string} mode - Execution mode: 'full' | 'partial'
   * @param {Object[]} failedReports - Failed reports to retry (partial mode only)
   * @param {Object} runStatePort - Run state port (for marking done/failed/partial)
   * @returns {Promise<Object>} Execution summary
   */
  return async function executeReports(eventContext, reports, mode, failedReports, runStatePort) {
    const { close_date, triggerType, triggerId } = eventContext;

    const reportQueue = [];

    if (mode === 'full') {
      // Process all reports
      for (const report of reports) {
        reportQueue.push({
          report,
          domain: report.domain || 'unknown',
          attemptNo: 1,
        });
      }
    } else if (mode === 'partial') {
      // Process only failed reports
      for (const item of failedReports || []) {
        const report = reports.find((r) => r.id === item.reportId);
        if (!report) {
          logger.warn('Failed report config not found, skipping', {
            reportId: item.reportId,
            triggerType,
          });
          continue;
        }
        reportQueue.push({
          report,
          domain: report.domain || item.domain || 'unknown',
          attemptNo: (item.attemptNo || 0) + 1,
        });
      }
    }

    let doneCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedList = [];

    // Empty queue handling
    if (reportQueue.length === 0) {
      if (mode === 'partial') {
        // Partial mode: empty queue means all reports already processed
        logger.info('Partial mode: No reports to retry (already processed)', {
          close_date,
          triggerType,
          reportsCount: reports.length,
        });
        const summaryObj = { total: 0, done: 0, failed: 0, skipped: 0 };
        await runStatePort.markDone(triggerId, { counts: summaryObj, failedReports: [] });
        return summaryObj;
      }

      // Full mode: empty queue is an error
      logger.error('No reports in queue', {
        close_date,
        triggerType,
        mode,
        reportsCount: reports.length,
      });
      const summaryObj = { total: 0, done: 0, failed: 0, skipped: 0 };
      await runStatePort.markFailed(triggerId, 'NO_REPORTS_PROCESSED', 'No reports in queue', {
        counts: summaryObj,
        error: { code: 'NO_REPORTS_PROCESSED', message: 'No reports in queue' },
      });
      return summaryObj;
    }

    // Process each report
    for (const item of reportQueue) {
      const { report, domain, attemptNo } = item;
      try {
        logger.info('Processing report', {
          reportId: report.id,
          domain,
          triggerType,
          close_date,
          attemptNo,
        });

        // Resolve output directory
        const outputDir = buildCustomOutputDir(report, close_date) ||
                         buildOutputDir(config.reportsOutputDir, close_date, domain);

        logger.info('Resolved outputDir', {
          reportId: report.id,
          domain,
          close_date,
          outputDir,
          usedCustomPath: !!report.customPath,
        });

        // Check if FLAG=0 for CMP_CLOSE trigger (no real data, skip SQL execution)
        if (eventContext.flag === 0 && triggerType === 'CMP_CLOSE') {
          logger.info('CMP_CLOSE FLAG=0 detected - skipping SQL, sending NO_DATA email', {
            reportId: report.id,
            domain,
            close_date,
            flag: eventContext.flag,
          });

          // Go directly to NO_DATA flow without executing SQL
          const mailRulesPort = ports.mailRulesPort;
          let recipients = [];
          let rule = null;

          if (mailRulesPort?.getRule && mailRulesPort?.getRecipients) {
            rule = await mailRulesPort.getRule({
              domain,
              reportCode: report.code || report.id,
              eventType: 'NO_DATA',
              languageCode: config.defaultEmailLanguage || 'EN',
            });

            if (rule) {
              const recips = await mailRulesPort.getRecipients(rule.ruleId);
              recipients = Array.isArray(recips?.to) ? recips.to.filter(Boolean) : [];
            } else {
              logger.warn('Mail rule not found for NO_DATA email', { reportId: report.id, domain, triggerType });
            }
          } else {
            logger.warn('mailRulesPort not configured; skipping NO_DATA email send', { reportId: report.id, domain, triggerType });
          }

          if (recipients.length > 0 && rule) {
            // Render email using template engine
            const emailContext = {
              domain,
              reportCode: report.code || report.id,
              reportName: report.name,
              closeDate: close_date,
              eventType: 'NO_DATA',
              languageCode: rule.languageCode || 'AR',
            };

            const { from, subject, html } = await renderEmail({
              rule,
              context: emailContext,
              report,
              defaultFrom: config.emailFrom,
            });

            logger.info('Resolved recipients from mail rules', { reportId: report.id, eventType: 'NO_DATA', to: recipients });
            await ports.emailPort.send({
              from,
              to: recipients,
              subject,
              body: html,
              attachments: [],
            });
          } else {
            logger.warn('No active recipients for NO_DATA email; skipping send', { reportId: report.id, domain, triggerType });
          }

          await ports.auditPort.log(close_date, report.id, 'DONE', {
            domain,
            triggerType,
            rowCount: 0,
            filePath: null,
            attemptNo,
            reason: 'FLAG=0 (no real data)',
          });

          doneCount++;
          logger.info('NO_DATA report completed (FLAG=0)', { reportId: report.id });
          continue;
        }

        // Execute SQL query
        const rows = await ports.reportQueryPort.fetchData(
          report.sql,
          { close_date },
          { reportId: report.id, domain, triggerType }
        );

        // Handle empty result set with NO_DATA flow
        if (!rows || rows.length === 0) {
          const mailRulesPort = ports.mailRulesPort;
          let recipients = [];
          let rule = null;

          if (mailRulesPort?.getRule && mailRulesPort?.getRecipients) {
            rule = await mailRulesPort.getRule({
              domain,
              reportCode: report.code || report.id,
              eventType: 'NO_DATA',
              languageCode: config.defaultEmailLanguage || 'EN',
            });

            if (rule) {
              const recips = await mailRulesPort.getRecipients(rule.ruleId);
              recipients = Array.isArray(recips?.to) ? recips.to.filter(Boolean) : [];
            } else {
              logger.warn('Mail rule not found for NO_DATA email', { reportId: report.id, domain, triggerType });
            }
          } else {
            logger.warn('mailRulesPort not configured; skipping NO_DATA email send', { reportId: report.id, domain, triggerType });
          }

          if (recipients.length > 0 && rule) {
            // Render email using template engine
            const emailContext = {
              domain,
              reportCode: report.code || report.id,
              reportName: report.name,
              closeDate: close_date,
              eventType: 'NO_DATA',
              languageCode: rule.languageCode || 'AR',
            };

            const { from, subject, html } = await renderEmail({
              rule,
              context: emailContext,
              report,
              defaultFrom: config.emailFrom,
            });

            logger.info('Resolved recipients from mail rules', { reportId: report.id, eventType: 'NO_DATA', to: recipients });
            await ports.emailPort.send({
              from,
              to: recipients,
              subject,
              body: html,
              attachments: [],
            });
          } else {
            logger.warn('No active recipients for NO_DATA email; skipping send', { reportId: report.id, domain, triggerType });
          }

          await ports.auditPort.log(close_date, report.id, 'DONE', {
            domain,
            triggerType,
            rowCount: 0,
            filePath: null,
            attemptNo,
          });

          doneCount++;
          logger.info('NO_DATA report completed', { reportId: report.id });
          continue;
        }

        // Create output directory (only after confirming data exists)
        await ports.fileStorePort.ensureDir(outputDir);

        // Apply domain hooks (if any)
        let processedRows = rows;
        if (report.hooks?.processData) {
          processedRows = await report.hooks.processData(rows, close_date);
        }

        // Export to file
        const fileName = resolveFileName(report.fileName, close_date);
        const filePath = await ports.exportPort.generate(processedRows, {
          format: report.format,
          sheetName: report.sheetName || 'Sheet1',
          fileName,
          outputDir,
        });

        // Fetch recipients from mail rules (DATA flow)
        const mailRulesPort = ports.mailRulesPort;
        let recipients = [];
        let rule = null;

        if (mailRulesPort?.getRule && mailRulesPort?.getRecipients) {
          rule = await mailRulesPort.getRule({
            domain,
            reportCode: report.code || report.id,
            eventType: 'DATA',
            languageCode: config.defaultEmailLanguage || 'EN',
          });

          if (rule) {
            const recips = await mailRulesPort.getRecipients(rule.ruleId);
            recipients = Array.isArray(recips?.to) ? recips.to.filter(Boolean) : [];
          } else {
            logger.error('Mail rule not found for DATA report', { reportId: report.id, domain, triggerType });
          }
        } else {
          logger.error('mailRulesPort not configured', { reportId: report.id, domain, triggerType });
        }

        if (recipients.length === 0 || !rule) {
          logger.error('No recipients found in mail rules for DATA report', { reportId: report.id, domain, triggerType });
          
          await ports.auditPort.log(close_date, report.id, 'FAILED', {
            domain,
            triggerType,
            errorCode: 'NO_RECIPIENTS',
            errorMsg: 'No recipients found in mail rules',
            retryable: 'N',
            attemptNo,
          });

          failedCount++;
          failedList.push({
            reportId: report.id,
            errorCode: 'NO_RECIPIENTS',
            retryable: false,
          });

          logger.error('Report failed', {
            reportId: report.id,
            errorCode: 'NO_RECIPIENTS',
            retryable: false,
            attemptNo,
          });

          continue;
        }

        // Render email using template engine
        const emailContext = {
          domain,
          reportCode: report.code || report.id,
          reportName: report.name,
          closeDate: close_date,
          eventType: 'DATA',
          languageCode: rule.languageCode || 'AR',
          rowCount: processedRows.length,
          fileName,
        };

        const { from, subject, html } = await renderEmail({
          rule,
          context: emailContext,
          report,
          defaultFrom: config.emailFrom,
        });

        logger.info('Resolved recipients from mail rules', { reportId: report.id, eventType: 'DATA', to: recipients });
        await ports.emailPort.send({
          from,
          to: recipients,
          subject,
          body: html,
          attachments: [{ filename: fileName, path: filePath }],
        });

        // Log success
        await ports.auditPort.log(close_date, report.id, 'DONE', {
          domain,
          triggerType,
          rowCount: processedRows.length,
          filePath,
          attemptNo,
        });

        doneCount++;
        logger.info('Report completed', {
          reportId: report.id,
          rowCount: processedRows.length,
        });
      } catch (err) {
        const appError = normalizeError(err, `report:${report.id}`);
        const isLastAttempt = attemptNo >= config.maxRetryAttempts;
        const effectiveRetryable = appError.retryable && !isLastAttempt;

        await ports.auditPort.log(close_date, report.id, 'FAILED', {
          domain,
          triggerType,
          errorCode: appError.code,
          errorMsg: appError.message,
          retryable: effectiveRetryable ? 'Y' : 'N',
          attemptNo,
        });

        failedCount++;
        failedList.push({
          reportId: report.id,
          errorCode: appError.code,
          retryable: effectiveRetryable,
        });

        logger.error('Report failed', {
          reportId: report.id,
          errorCode: appError.code,
          retryable: effectiveRetryable,
          attemptNo,
        });

        continue;
      }
    }

    // Calculate summary
    const total = doneCount + failedCount + skippedCount;
    const summaryObj = { total, done: doneCount, failed: failedCount, skipped: skippedCount };
    const summary = JSON.stringify(summaryObj);

    // Update execution state
    if (failedCount === 0 && doneCount > 0) {
      await runStatePort.markDone(triggerId, { counts: summaryObj, failedReports: [] });
      logger.info('Reports execution completed: DONE', {
        close_date,
        triggerType,
        summary,
      });
    } else if (failedCount === 0 && doneCount === 0 && skippedCount > 0) {
      // All reports skipped (no data) - mark as DONE to prevent retry loop
      await runStatePort.markDone(triggerId, { counts: summaryObj, failedReports: [] });
      logger.info('Reports execution completed: DONE (no output - all skipped)', {
        close_date,
        triggerType,
        summary,
      });
    } else if (doneCount > 0 || skippedCount > 0) {
      await runStatePort.markPartial(triggerId, { counts: summaryObj, failedReports: failedList });
      logger.warn('Reports execution completed: PARTIAL', {
        close_date,
        triggerType,
        summary,
      });
    } else {
      await runStatePort.markFailed(triggerId, 'ALL_REPORTS_FAILED', 'All reports failed', {
        counts: summaryObj,
        failedReports: failedList,
        error: { code: 'ALL_REPORTS_FAILED', message: 'All reports failed' },
      });
      logger.error('Reports execution completed: FAILED', {
        close_date,
        triggerType,
        summary,
      });
    }

    // Send admin notification if needed
    const hasNonRetryable = failedList.some((f) => !f.retryable);
    if (hasNonRetryable && config.notifyOnFailure && config.adminEmail) {
      try {
        await ports.emailPort.send({
          to: config.adminEmail,
          subject: `⚠️ Email Worker Alert — ${triggerType} — ${close_date}`,
          body: buildAdminNotificationBody(eventContext, failedList, summary),
          attachments: [],
        });
        logger.info('Admin notification sent', { close_date, triggerType });
      } catch (notifyErr) {
        logger.error('Failed to send admin notification', {
          error: notifyErr.message,
          close_date,
          triggerType,
        });
      }
    }

    return summaryObj;
  };
}
