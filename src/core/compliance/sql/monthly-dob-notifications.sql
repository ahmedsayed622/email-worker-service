-- Monthly DOB Notifications Report
-- Domain: compliance
-- TriggerType: MONTH_START
-- Runs on: 1st day of each month
-- Params: :month_start_mmdd, :month_end_mmdd (MMDD as NUMBER, e.g. 401, 430)
-- Retrieves clients whose date of birth falls within the current month

SELECT DISTINCT
  A.PROFILE_ID,
  A.CUSTOMER_NAME_EN,
  A.CUSTOMER_NAME_AR,
  B.NIN,
  B.C_ACCOUNT,
  A.MOBILE_1,
  A.MOBILE_2,
  CASE WHEN C.ALL_TO_DATE > 20250403 THEN 'Yes' ELSE 'No' END AS CLIENT_SUSPEND,
  C.NOTES,
  A.DOB,
  EDATA_CAST_DATETIME(A.DOB, 'D,/,M,/,Y') AS DATE_OF_BIRTH
FROM T_PROFILE_INFO_SETTING A
INNER JOIN T_INVESTMENT_ACCOUNT_PROFILE B
  ON A.PROFILE_ID = B.PROFILE_ID
LEFT JOIN BO_CLIENT_SUSPEND C
  ON A.PROFILE_ID = C.PROFILE_ID
WHERE substr(A.DOB, 5, 4) BETWEEN :month_start_mmdd AND :month_end_mmdd
  AND A.CUSTOMER_CATEGORY = 1
ORDER BY DATE_OF_BIRTH
