export const monthlyDobNotifications = {
  // Identity
  id: 'cmp-monthly-dob',
  name: 'Monthly DOB Notifications',

  // Data source
  sql: 'core/compliance/sql/monthly-dob-notifications.sql',
  requiredParams: ['month_start_mmdd', 'month_end_mmdd'],

  // Trigger routing
  triggerType: 'MONTH_START',

  // Output
  format: 'xlsx',
  sheetName: 'DOB Notifications',
  fileName: 'MonthlyDOB_{CLOSE_DATE}.xlsx',
  useDateFolder: true,

  // Email
  subject: 'Monthly DOB Notifications - {CLOSE_DATE}',

  // Behavior
  exportWhenEmpty: true,
  enabled: true,
};
