-- ============================================================
-- Seed: WORKER_MAIL_GROUP + WORKER_MAIL_GROUP_MEMBER
--
-- Groups:
--   1 = FIN_GROUP          (Finance)
--   2 = CMP_GROUP          (Compliance — daily)
--   3 = OPS_GROUP          (Operations)
--   4 = CMP_GROUP_MONTHLY  (Compliance — monthly DOB)
--
-- Members are added by ADDRESS_ID (see mail_addresses.sql).
-- Additional members for CMP_GROUP_MONTHLY (group 4) are added
-- at runtime via WORKER_EMAIL_MANAGE / WORKER_GROUP_MANAGE.
-- ============================================================

-- Groups
INSERT INTO WORKER_MAIL_GROUP 
  (GROUP_ID, GROUP_CODE, GROUP_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (1, 'FIN_GROUP', 'Finance Group', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_GROUP 
  (GROUP_ID, GROUP_CODE, GROUP_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (2, 'CMP_GROUP', 'Compliance Group', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_GROUP 
  (GROUP_ID, GROUP_CODE, GROUP_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (3, 'OPS_GROUP', 'Operations Group', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_GROUP
  (GROUP_ID, GROUP_CODE, GROUP_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (4, 'CMP_GROUP_MONTHLY', 'Compliance Monthly Group', 'Y', SYSTIMESTAMP);

COMMIT;

-- Group members (initial assignments)

-- Mohamed.Dessouky → Finance Group
INSERT INTO WORKER_MAIL_GROUP_MEMBER 
  (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (1, 1, 'Y', SYSTIMESTAMP);

-- Ahmed.Zaghlol → Operations Group
INSERT INTO WORKER_MAIL_GROUP_MEMBER 
  (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (3, 2, 'Y', SYSTIMESTAMP);

-- Ahmed.Dessouky → Compliance Group
INSERT INTO WORKER_MAIL_GROUP_MEMBER 
  (GROUP_ID, ADDRESS_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (2, 3, 'Y', SYSTIMESTAMP);

COMMIT;
