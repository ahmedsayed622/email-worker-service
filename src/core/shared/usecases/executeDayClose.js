import logger from '../../../shared/logger/logger.js';
import { normalizeError } from '../../../shared/errors/normalizeError.js';
import { resolveFileName, resolveSubject, buildOutputDir, buildCustomOutputDir } from '../domain/reportNaming.js';
import { resolveTemplatePath, resolveSignaturePath } from '../../../templates/engine/resolveTemplatePath.js';
import { loadTemplate } from '../../../templates/engine/loadTemplate.js';
import { renderTemplate } from '../../../templates/engine/renderTemplate.js';
import { getDefaultSignatureHtml } from '../domain/emailTemplates/signatures/default_v1.signature.js';

function buildAdminNotificationBody(closeDate, failedList, summary) {
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
    <div class="header">تنبيه - فشل تقارير الإغلاق</div>
    <div class="content">
      <p>تاريخ الإغلاق: <strong>${closeDate}</strong></p>
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

export function createExecuteDayClose(ports, config) {
  return async function executeDayClose(closeDate, domains, mode, failedReports) {
    const reportQueue = [];

    if (mode === 'full') {
      for (const domain of domains) {
        for (const report of domain.reports) {
          reportQueue.push({
            report,
            domain: domain.domain,
            hooks: domain.hooks,
            attemptNo: 1,
          });
        }
      }
    } else if (mode === 'partial') {
      for (const item of failedReports || []) {
        const domainObj = domains.find((d) => d.domain === item.domain) ||
          domains.find((d) => d.reports.some((r) => r.id === item.reportId));
        const report = domainObj?.reports?.find((r) => r.id === item.reportId);
        if (!domainObj || !report) {
          logger.warn('Failed report config not found, skipping', { reportId: item.reportId });
          continue;
        }
        reportQueue.push({
          report,
          domain: domainObj.domain,
          hooks: domainObj.hooks,
          attemptNo: (item.attemptNo || 0) + 1,
        });
      }
    }

    let doneCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const failedList = [];

    if (reportQueue.length === 0) {
      if (mode === 'partial') {
        // In partial mode, empty queue means no retryable reports (already processed or all skipped)
        // This is not an error - mark as DONE and exit gracefully
        logger.info('Partial mode: No reports to retry (already processed)', {
          closeDate,
          domainsCount: domains.length,
        });
        await ports.runStatePort.markDone(closeDate);
        return;
      }
      // In full mode, empty queue is an error
      logger.error('No reports in queue', {
        closeDate,
        mode,
        domainsCount: domains.length,
        totalReportsInDomains: domains.reduce((s, d) => s + d.reports.length, 0),
      });
      await ports.runStatePort.markFailed(closeDate, 'NO_REPORTS_PROCESSED', JSON.stringify({
        total: 0,
        done: 0,
        failed: 0,
        skipped: 0,
      }));
      return;
    }

    for (const item of reportQueue) {
      const { report, domain, hooks, attemptNo } = item;
      try {
        logger.info('Processing report', { reportId: report.id, domain, closeDate, attemptNo });

        // استخدام Custom Path إذا موجود، وإلا استخدام Default
        const outputDir = buildCustomOutputDir(report, closeDate) || 
                         buildOutputDir(config.reportsOutputDir, closeDate, domain);
        
        logger.info('Resolved outputDir', {
          reportId: report.id,
          domain,
          closeDate,
          outputDir,
          usedCustomPath: !!report.customPath,
        });

        const rows = await ports.reportQueryPort.fetchData(
          report.sql,
          { close_date: closeDate },
          { reportId: report.id, domain }
        );
        if (!rows || rows.length === 0) {
          await ports.auditPort.log(closeDate, report.id, 'SKIPPED', {
            domain,
            rowCount: 0,
            attemptNo,
          });
          skippedCount++;
          logger.info('Report skipped (no data)', { reportId: report.id });
          continue;
        }

        // إنشاء الـ Directory (only after confirming we have data)
        await ports.fileStorePort.ensureDir(outputDir);

        let processedRows = rows;
        if (hooks?.processData) {
          processedRows = await hooks.processData(rows, closeDate);
        }

        const fileName = resolveFileName(report.fileName, closeDate);
        const filePath = await ports.exportPort.generate(processedRows, {
          format: report.format,
          sheetName: report.sheetName || 'Sheet1',
          fileName,
          outputDir,
        });

        const subject = resolveSubject(report.subject, closeDate);
        
        // Render email using template engine (legacy mode with default language AR)
        const companySignatureHtml = await getDefaultSignatureHtml('AR');
        const signaturePath = await resolveSignaturePath({
          domain,
          languageCode: 'AR',
          signatureKey: 'default',
        });
        const signatureTemplate = await loadTemplate(signaturePath);
        const signatureHtml = renderTemplate(signatureTemplate, {
          signatureHtml: companySignatureHtml,
        });
        
        const emailPath = await resolveTemplatePath({
          domain,
          reportCode: report.code || report.id,
          eventType: 'DATA',
          languageCode: 'AR',
        });
        const emailTemplate = await loadTemplate(emailPath);
        const body = renderTemplate(emailTemplate, {
          reportName: report.name,
          closeDate,
          rowCount: processedRows.length,
          fileName,
          domain,
          reportCode: report.code || report.id,
          signatureHtml,
        });

        await ports.emailPort.send({
          to: report.recipients,
          subject,
          body,
          attachments: [{ filename: fileName, path: filePath }],
        });

        await ports.auditPort.log(closeDate, report.id, 'DONE', {
          domain,
          rowCount: processedRows.length,
          filePath,
          attemptNo,
        });

        doneCount++;
        logger.info('Report completed', { reportId: report.id, rowCount: processedRows.length });
      } catch (err) {
        const appError = normalizeError(err, `report:${report.id}`);
        const isLastAttempt = attemptNo >= config.maxRetryAttempts;
        const effectiveRetryable = appError.retryable && !isLastAttempt;

        await ports.auditPort.log(closeDate, report.id, 'FAILED', {
          domain,
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

    const total = doneCount + failedCount + skippedCount;
    const summaryObj = { total, done: doneCount, failed: failedCount, skipped: skippedCount };
    const summary = JSON.stringify(summaryObj);

    if (failedCount === 0 && doneCount > 0) {
      await ports.runStatePort.markDone(closeDate);
      logger.info('Day close completed: DONE', { closeDate, summary });
    } else if (failedCount === 0 && doneCount === 0 && skippedCount > 0) {
      // All reports skipped (no data) - mark as DONE to prevent retry loop
      await ports.runStatePort.markDone(closeDate);
      logger.info('Day close completed: DONE (no output - all skipped)', { closeDate, summary });
    } else if (doneCount > 0 || skippedCount > 0) {
      await ports.runStatePort.markPartial(closeDate, summary);
      logger.warn('Day close completed: PARTIAL', { closeDate, summary });
    } else {
      await ports.runStatePort.markFailed(closeDate, 'ALL_REPORTS_FAILED', summary);
      logger.error('Day close completed: FAILED', { closeDate, summary });
    }

    const hasNonRetryable = failedList.some((f) => !f.retryable);
    if (hasNonRetryable && config.notifyOnFailure && config.adminEmail) {
      try {
        await ports.emailPort.send({
          to: config.adminEmail,
          subject: `⚠️ Email Worker Alert — ${closeDate}`,
          body: buildAdminNotificationBody(closeDate, failedList, summary),
          attachments: [],
        });
        logger.info('Admin notification sent', { closeDate });
      } catch (notifyErr) {
        logger.error('Failed to send admin notification', {
          error: notifyErr.message,
          closeDate,
        });
      }
    }
  };
}
