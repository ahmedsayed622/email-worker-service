-- ============================================================
-- Seed: WORKER_MAIL_RULES + WORKER_MAIL_RULE_TARGET
--
-- 16 rules total:
--   1–12  Daily (finance / compliance / operations) × DATA / NO_DATA × EN / AR
--   13–16 Monthly (cmp-monthly-dob) × DATA / NO_DATA × EN / AR
--
-- Targets link each rule to the appropriate group.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- FINANCE RULES (fin-all-profiles)
-- ─────────────────────────────────────────────────────────────

-- Rule 1: Finance - NO_DATA - EN
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (1, 'finance', 'fin-all-profiles', 'NO_DATA', 'EN',
   'no_data_v1', 'default_v1', ' - No Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 2: Finance - DATA - EN (PRIMARY - used by app)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (2, 'finance', 'fin-all-profiles', 'DATA', 'EN',
   'data_v1', 'default_v1', ' - Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 5: Finance - NO_DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (5, 'finance', 'fin-all-profiles', 'NO_DATA', 'AR',
   'no_data_v1', 'default_v1', ' - لا توجد بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 6: Finance - DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (6, 'finance', 'fin-all-profiles', 'DATA', 'AR',
   'data_v1', 'default_v1', ' - بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- ─────────────────────────────────────────────────────────────
-- COMPLIANCE RULES (comp-daily-compliance)
-- ─────────────────────────────────────────────────────────────

-- Rule 3: Compliance - DATA - EN (PRIMARY)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (3, 'compliance', 'comp-daily-compliance', 'DATA', 'EN',
   'data_v1', 'default_v1', ' - Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 4: Compliance - NO_DATA - EN
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (4, 'compliance', 'comp-daily-compliance', 'NO_DATA', 'EN',
   'no_data_v1', 'default_v1', ' - No Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 7: Compliance - DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (7, 'compliance', 'comp-daily-compliance', 'DATA', 'AR',
   'data_v1', 'default_v1', ' - بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 8: Compliance - NO_DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (8, 'compliance', 'comp-daily-compliance', 'NO_DATA', 'AR',
   'no_data_v1', 'default_v1', ' - لا توجد بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- ─────────────────────────────────────────────────────────────
-- OPERATIONS RULES (ops-daily-operations)
-- ─────────────────────────────────────────────────────────────

-- Rule 9: Operations - DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (9, 'operations', 'ops-daily-operations', 'DATA', 'AR',
   'data_v1', 'default_v1', ' - بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 10: Operations - DATA - EN (PRIMARY)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (10, 'operations', 'ops-daily-operations', 'DATA', 'EN',
   'data_v1', 'default_v1', ' - Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 11: Operations - NO_DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (11, 'operations', 'ops-daily-operations', 'NO_DATA', 'AR',
   'no_data_v1', 'default_v1', ' - لا توجد بيانات', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- Rule 12: Operations - NO_DATA - EN
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (12, 'operations', 'ops-daily-operations', 'NO_DATA', 'EN',
   'no_data_v1', 'default_v1', ' - No Data', 'reports@alahlypharos.com',
   'Y', 'Y', SYSTIMESTAMP);

-- ─────────────────────────────────────────────────────────────
-- COMPLIANCE MONTHLY (cmp-monthly-dob) — RULES 13–16
-- ─────────────────────────────────────────────────────────────

INSERT INTO WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (13, 'compliance', 'cmp-monthly-dob', 'DATA', 'EN',
   'Y', 'Y',
   NULL, 'monthly_v1', 'default_v1', 'reports@alahlypharos.com',
   SYSTIMESTAMP, SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (14, 'compliance', 'cmp-monthly-dob', 'NO_DATA', 'EN',
   'Y', 'Y',
   ' - No Data', 'monthly_no_data_v1', 'default_v1', 'reports@alahlypharos.com',
   SYSTIMESTAMP, SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (15, 'compliance', 'cmp-monthly-dob', 'DATA', 'AR',
   'Y', 'Y',
   NULL, 'monthly_v1', 'default_v1', 'reports@alahlypharos.com',
   SYSTIMESTAMP, SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_RULES
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE,
   IS_ACTIVE, NOTIFY_ENABLED,
   SUBJECT_SUFFIX, TEMPLATE_KEY, SIGNATURE_KEY, FROM_ADDRESS,
   CREATED_AT, UPDATED_AT)
VALUES
  (16, 'compliance', 'cmp-monthly-dob', 'NO_DATA', 'AR',
   'Y', 'Y',
   ' - لا توجد بيانات', 'monthly_no_data_v1', 'default_v1', 'reports@alahlypharos.com',
   SYSTIMESTAMP, SYSTIMESTAMP);

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- Rule Targets — link rules to groups
-- ─────────────────────────────────────────────────────────────

-- Finance rules (1, 2, 5, 6) → FIN_GROUP (1)
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (1, 6, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Finance DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (2, 2, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Finance DATA EN
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (3, 5, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Finance NO_DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (4, 1, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Finance NO_DATA EN

-- Compliance daily rules (3, 4, 7, 8) → CMP_GROUP (2)
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (5, 7, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Compliance DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (6, 4, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Compliance NO_DATA EN
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (7, 8, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Compliance NO_DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (8, 3, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Compliance DATA EN

-- Operations rules (9, 10, 11, 12) → OPS_GROUP (3)
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (9, 10, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Operations DATA EN
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (10, 9, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Operations DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (11, 11, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Operations NO_DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (12, 12, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Operations NO_DATA EN

-- Compliance monthly rules (13–16) → CMP_GROUP_MONTHLY (4)
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (13, 13, 'TO', 'GROUP', NULL, 4, 'Y', SYSTIMESTAMP);  -- Monthly DATA EN
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (14, 14, 'TO', 'GROUP', NULL, 4, 'Y', SYSTIMESTAMP);  -- Monthly NO_DATA EN
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (15, 15, 'TO', 'GROUP', NULL, 4, 'Y', SYSTIMESTAMP);  -- Monthly DATA AR
INSERT INTO WORKER_MAIL_RULE_TARGET (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES (16, 16, 'TO', 'GROUP', NULL, 4, 'Y', SYSTIMESTAMP);  -- Monthly NO_DATA AR

COMMIT;
