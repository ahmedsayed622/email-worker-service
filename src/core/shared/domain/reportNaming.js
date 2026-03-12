import path from 'node:path';

export function resolveFileName(template, closeDate) {
  return String(template || '').replaceAll('{CLOSE_DATE}', closeDate);
}

export function resolveSubject(template, closeDate) {
  return String(template || '').replaceAll('{CLOSE_DATE}', closeDate);
}

export function buildOutputDir(baseDir, closeDate, domain) {
  return path.join(baseDir, String(closeDate), String(domain || ''));
}

export function buildCustomOutputDir(report, closeDate) {
  // إذا كان التقرير فيه customPath، استخدمه بدل الـ default
  if (report.customPath) {
    if (report.useDateFolder) {
      // Finance: customPath / yyyymmdd /
      return path.join(report.customPath, String(closeDate));
    } else {
      // Operations: customPath / (بدون تاريخ)
      return report.customPath;
    }
  }
  // Default fallback (لو مفيش customPath)
  return null;
}

