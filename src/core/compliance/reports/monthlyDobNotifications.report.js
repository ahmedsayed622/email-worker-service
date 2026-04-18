export const monthlyDobNotifications = {
  // Identity
  id: 'cmp-monthly-dob',
  name: 'Monthly DOB Notifications',

  // Data source — reads from staging table populated by CMP_CLIENTS_PRO_DOB procedure
  sql: 'core/compliance/sql/monthly-dob-notifications.sql',
  requiredParams: ['close_date'],

  // Trigger routing
  triggerType: 'CMP_MONTH_START',

  // Output
  format: 'xlsx',
  sheetName: 'DOB Notifications',
  fileName: 'MonthlyDOB_{CLOSE_DATE}.xlsx',
  useDateFolder: true,

  // Email
  subject: 'Monthly DOB Notifications - {CLOSE_DATE}',

  enabled: true,
};
