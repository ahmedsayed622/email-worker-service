-- Monthly DOB Notifications Report
-- Domain: compliance
-- TriggerType: CMP_MONTH_START
-- Runs on: 1st day of each month (after Oracle Scheduler job at 10:00 AM)
-- Source: CMP_CLIENTS_TBL_DOB staging table (populated by CMP_CLIENTS_PRO_DOB procedure)
-- Params: :close_date (YYYYMMDD NUMBER — matches INSERT_DATE in staging table)
-- FLAG=1 rows only — FLAG=0 (no data) is handled before SQL execution

SELECT
  PROFILE_ID,
  CUSTOMER_NAME_EN,
  CUSTOMER_NAME_AR,
  NIN,
  C_ACCOUNT,
  MOBILE_1,
  MOBILE_2,
  CLIENT_SUSPEND,
  NOTES,
  DOB,
  DATE_OF_BIRTH
FROM CMP_CLIENTS_TBL_DOB
WHERE FLAG = 1
  AND INSERT_DATE = :close_date
ORDER BY DATE_OF_BIRTH
