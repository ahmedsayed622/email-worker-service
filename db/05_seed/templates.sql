-- ============================================================
-- Seed: WORKER_MAIL_TEMPLATE_REGISTRY
-- Email body templates (data / no_data / monthly variants)
-- ============================================================

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

-- Monthly DOB templates (cmp-monthly-dob)
INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('monthly_v1', 'EN', 'LTR', NULL, 'src/templates/shared/emails/monthly.en.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('monthly_v1', 'AR', 'RTL', NULL, 'src/templates/shared/emails/monthly.ar.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('monthly_no_data_v1', 'EN', 'LTR', NULL, 'src/templates/shared/emails/monthly_no_data.en.html', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_TEMPLATE_REGISTRY
  (TEMPLATE_KEY, LANGUAGE_CODE, DIRECTION, SUBJECT_TPL, BODY_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('monthly_no_data_v1', 'AR', 'RTL', NULL, 'src/templates/shared/emails/monthly_no_data.ar.html', 'Y', SYSTIMESTAMP);

COMMIT;
