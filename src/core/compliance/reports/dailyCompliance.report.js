export const dailyCompliance = {
  id: 'comp-daily-compliance',
  name: 'Daily Compliance Report',
  sql: 'core/compliance/sql/daily-compliance.sql',
  format: 'xlsx',
  sheetName: 'Compliance',
  fileName: 'DailyCompliance_{CLOSE_DATE}.xlsx',
  recipients: ['compliance@alahlypharos.com'],
  subject: 'Daily Compliance Report - {CLOSE_DATE}',
  trigger: 'day-close', // Deprecated: use triggerType
  triggerType: 'CMP_CLOSE', // NEW: Multi-trigger support
  requiredParams: ['close_date'], // NEW: SQL bind validation
  exportWhenEmpty: true, // Allow empty file generation when no data
  enabled: true,
  useDateFolder: true,
};
