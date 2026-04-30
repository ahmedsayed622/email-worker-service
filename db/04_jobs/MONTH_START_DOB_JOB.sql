-- ============================================================
-- Oracle Scheduler Job: MONTH_START_DOB_JOB
-- Purpose : Runs CMP_CLIENTS_PRO_DOB on the 1st of each month
--           at 10:00 AM to populate DOB staging tables.
-- Tables  : CMP_CLIENTS_TBL_DOB       (staging data)
--           CMP_CLIENTS_TBL_CTRL_DOB  (trigger signal)
-- Schedule: FREQ=MONTHLY ; BYMONTHDAY=1 ; BYHOUR=10
-- ============================================================

BEGIN
  DBMS_SCHEDULER.CREATE_JOB (
    job_name        => 'BACK_OFFICE.MONTH_START_DOB_JOB',
    job_type        => 'STORED_PROCEDURE',
    job_action      => 'BACK_OFFICE.CMP_CLIENTS_PRO_DOB',
    start_date      => TRUNC(LAST_DAY(SYSDATE) + 1) + 10/24,
    repeat_interval => 'FREQ=MONTHLY;BYMONTHDAY=1;BYHOUR=10;BYMINUTE=0;BYSECOND=0',
    enabled         => TRUE,
    auto_drop       => FALSE,
    comments        => 'Monthly DOB notifications — runs 1st of each month at 10:00 AM'
  );
END;
/

-- ============================================================
-- To verify the job was created:
-- SELECT JOB_NAME, STATUS, NEXT_RUN_DATE
-- FROM USER_SCHEDULER_JOBS
-- WHERE JOB_NAME = 'MONTH_START_DOB_JOB';
--
-- To run manually for testing:
-- EXEC DBMS_SCHEDULER.RUN_JOB('BACK_OFFICE.MONTH_START_DOB_JOB');
--
-- To drop the job if needed:
-- EXEC DBMS_SCHEDULER.DROP_JOB('BACK_OFFICE.MONTH_START_DOB_JOB');
-- ============================================================
