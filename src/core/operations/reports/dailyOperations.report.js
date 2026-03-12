export const dailyOperations = {
  id: 'ops-daily-operations',
  name: 'NBE Clients',
  sql: 'core/operations/sql/daily-ops.sql',
  format: 'xlsx',
  sheetName: 'Operations',
  fileName: 'nbe clients({CLOSE_DATE}).xlsx',
  recipients: ['operations@alahlypharos.com'],
  subject: 'NBE Clients - {CLOSE_DATE}',
  trigger: 'day-close', // Deprecated: use triggerType
  triggerType: 'OPS_CLOSE', // NEW: Multi-trigger support
  requiredParams: [], // Intentionally runs without close_date filter (business requirement)
  exportWhenEmpty: true, // Allow empty file generation when no data
  enabled: true,
  useDateFolder: false,
};
