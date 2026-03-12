-- ═══════════════════════════════════════════════════════════════════════════════
-- Email Worker - Production Database Setup
-- Environment: PRODUCTION (back_office schema)
-- Date: 2026-03-03
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Template Registry (Static Configuration)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Templates for DATA and NO_DATA email body

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY 
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('data_v1', 'EN', 'LTR', NULL, 'src/templates/shared/emails/data.en.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY 
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('data_v1', 'AR', 'RTL', NULL, 'src/templates/shared/emails/data.ar.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY 
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('no_data_v1', 'EN', 'LTR', NULL, 'src/templates/shared/emails/no_data.en.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY 
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('no_data_v1', 'AR', 'RTL', NULL, 'src/templates/shared/emails/no_data.ar.html', 'Y', SYSTIMESTAMP);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Signature Registry (Static Configuration)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Company signature HTML files

INSERT INTO WORKER_MAIL_SIGNATURE_REGISTRY 
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('default_v1', 'EN', 'src/templates/shared/signatures/en/raw/AlahlyINV_Signature.htm', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_SIGNATURE_REGISTRY 
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('default_v1', 'AR', 'src/templates/shared/signatures/ar/raw/AlahlyINV_Signature.htm', 'Y', SYSTIMESTAMP);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Email Addresses (Production Recipients)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Register the 3 production email addresses

INSERT INTO WORKER_MAIL_ADDRESS 
  (ADDRESS_ID, ADDRESS, DISPLAY_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (1, 'Mohamed.Dessouky@alahlypharos.com', 'Mohamed Dessouky', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_ADDRESS 
  (ADDRESS_ID, ADDRESS, DISPLAY_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (2, 'Ahmed.Zaghlol@alahlypharos.com', 'Ahmed Zaghlol', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_ADDRESS 
  (ADDRESS_ID, ADDRESS, DISPLAY_NAME, IS_ACTIVE, CREATED_AT)
VALUES
  (3, 'Ahmed.Dessouky@alahlypharos.com', 'Ahmed Dessouky', 'Y', SYSTIMESTAMP);

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Email Groups (Domain-based Groups)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Create groups for Finance, Compliance, and Operations

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

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Group Members (Assign Emails to Groups)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Link each email address to its designated group

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

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Mail Rules (Email Configuration per Report/Event/Language)
-- ═══════════════════════════════════════════════════════════════════════════════
-- 12 Rules: 3 reports × (DATA + NO_DATA) × (EN + AR)
-- Using EN as the primary language (as per DEFAULT_EMAIL_LANGUAGE=EN)

-- ─────────────────────────────────────────────────────────────────────────────
-- FINANCE RULES (fin-all-profiles)
-- ─────────────────────────────────────────────────────────────────────────────

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

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE RULES (comp-daily-compliance)
-- ─────────────────────────────────────────────────────────────────────────────

-- Rule 3: Compliance - DATA - EN (PRIMARY - used by app)
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

-- ─────────────────────────────────────────────────────────────────────────────
-- OPERATIONS RULES (ops-daily-operations)
-- ─────────────────────────────────────────────────────────────────────────────

-- Rule 10: Operations - DATA - EN (PRIMARY - used by app)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (10, 'operations', 'ops-daily-operations', 'DATA', 'EN',
   'data_v1', 'default_v1', ' - Data', 'reports@alahlypharos.com',
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

-- Rule 9: Operations - DATA - AR (backup)
INSERT INTO WORKER_MAIL_RULES 
  (RULE_ID, DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE, 
   TEMPLATE_KEY, SIGNATURE_KEY, SUBJECT_SUFFIX, FROM_ADDRESS, 
   IS_ACTIVE, NOTIFY_ENABLED, CREATED_AT)
VALUES
  (9, 'operations', 'ops-daily-operations', 'DATA', 'AR',
   'data_v1', 'default_v1', ' - بيانات', 'reports@alahlypharos.com',
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

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 7: Rule Targets (Link Rules to Groups)
-- ═══════════════════════════════════════════════════════════════════════════════
-- Map each rule to its corresponding group

-- ─────────────────────────────────────────────────────────────────────────────
-- FINANCE RULES → FIN_GROUP (Mohamed.Dessouky)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (1, 6, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Rule 6: Finance DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (2, 2, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Rule 2: Finance DATA EN

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (3, 5, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Rule 5: Finance NO_DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (4, 1, 'TO', 'GROUP', NULL, 1, 'Y', SYSTIMESTAMP);  -- Rule 1: Finance NO_DATA EN

-- ─────────────────────────────────────────────────────────────────────────────
-- COMPLIANCE RULES → CMP_GROUP (Ahmed.Dessouky)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (5, 7, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Rule 7: Compliance DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (6, 4, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Rule 4: Compliance NO_DATA EN

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (7, 8, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Rule 8: Compliance NO_DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (8, 3, 'TO', 'GROUP', NULL, 2, 'Y', SYSTIMESTAMP);  -- Rule 3: Compliance DATA EN

-- ─────────────────────────────────────────────────────────────────────────────
-- OPERATIONS RULES → OPS_GROUP (Ahmed.Zaghlol)
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (9, 10, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Rule 10: Operations DATA EN

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (10, 9, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Rule 9: Operations DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (11, 11, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Rule 11: Operations NO_DATA AR

INSERT INTO WORKER_MAIL_RULE_TARGET 
  (TARGET_ID, RULE_ID, RECIP_TYPE, TARGET_KIND, ADDRESS_ID, GROUP_ID, IS_ACTIVE, CREATED_AT)
VALUES
  (12, 12, 'TO', 'GROUP', NULL, 3, 'Y', SYSTIMESTAMP);  -- Rule 12: Operations NO_DATA EN

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VALIDATION QUERIES
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run these to verify the setup

-- Check all email addresses
SELECT * FROM WORKER_MAIL_ADDRESS ORDER BY ADDRESS_ID;

-- Check all groups
SELECT * FROM WORKER_MAIL_GROUP ORDER BY GROUP_ID;

-- Check group members (who gets which reports)
SELECT 
  g.GROUP_NAME,
  a.ADDRESS,
  a.DISPLAY_NAME
FROM WORKER_MAIL_GROUP g
JOIN WORKER_MAIL_GROUP_MEMBER gm ON g.GROUP_ID = gm.GROUP_ID
JOIN WORKER_MAIL_ADDRESS a ON gm.ADDRESS_ID = a.ADDRESS_ID
WHERE gm.IS_ACTIVE = 'Y' AND a.IS_ACTIVE = 'Y'
ORDER BY g.GROUP_ID;

-- Check all rules
SELECT 
  RULE_ID,
  DOMAIN,
  REPORT_CODE,
  EVENT_TYPE,
  LANGUAGE_CODE,
  TEMPLATE_KEY,
  FROM_ADDRESS
FROM WORKER_MAIL_RULES
ORDER BY DOMAIN, REPORT_CODE, EVENT_TYPE, LANGUAGE_CODE;

-- Check complete email routing (which emails go where)
SELECT 
  r.RULE_ID,
  r.DOMAIN,
  r.REPORT_CODE,
  r.EVENT_TYPE,
  r.LANGUAGE_CODE,
  g.GROUP_NAME,
  a.ADDRESS AS RECIPIENT_EMAIL
FROM WORKER_MAIL_RULES r
JOIN WORKER_MAIL_RULE_TARGET rt ON r.RULE_ID = rt.RULE_ID
JOIN WORKER_MAIL_GROUP g ON rt.GROUP_ID = g.GROUP_ID
JOIN WORKER_MAIL_GROUP_MEMBER gm ON g.GROUP_ID = gm.GROUP_ID
JOIN WORKER_MAIL_ADDRESS a ON gm.ADDRESS_ID = a.ADDRESS_ID
WHERE r.IS_ACTIVE = 'Y' 
  AND r.NOTIFY_ENABLED = 'Y'
  AND rt.IS_ACTIVE = 'Y'
  AND gm.IS_ACTIVE = 'Y'
  AND a.IS_ACTIVE = 'Y'
ORDER BY r.DOMAIN, r.REPORT_CODE, r.EVENT_TYPE, r.LANGUAGE_CODE;

-- ═══════════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════

/*
╔════════════════════════════════════════════════════════════════════════════╗
║ PRODUCTION EMAIL ROUTING SUMMARY                                           ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║ 📧 EMAIL ADDRESSES (3):                                                    ║
║   • Mohamed.Dessouky@alahlypharos.com  → Finance Group                     ║
║   • Ahmed.Zaghlol@alahlypharos.com     → Operations Group                  ║
║   • Ahmed.Dessouky@alahlypharos.com    → Compliance Group                  ║
║                                                                            ║
║ 📊 REPORTS (3):                                                            ║
║   • fin-all-profiles        → Mohamed.Dessouky (Finance)                   ║
║   • comp-daily-compliance   → Ahmed.Dessouky (Compliance)                  ║
║   • ops-daily-operations    → Ahmed.Zaghlol (Operations)                   ║
║                                                                            ║
║ 🔧 RULES (12):                                                             ║
║   • 4 rules per report (DATA/NO_DATA × EN/AR)                              ║
║   • EN rules are PRIMARY (DEFAULT_EMAIL_LANGUAGE=EN)                       ║
║   • AR rules are BACKUP (for future use)                                   ║
║                                                                            ║
║ ✅ CONFIGURATION:                                                          ║
║   • Templates: 4 registered (data/no_data × AR/EN)                         ║
║   • Signatures: 2 registered (default_v1 × AR/EN)                          ║
║   • All rules active and notify enabled                                    ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
*/

-- End of script
