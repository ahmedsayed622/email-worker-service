-- ============================================================
-- Seed: WORKER_MAIL_SIGNATURE_REGISTRY
-- Company HTML signatures (default_v1 in EN/AR)
-- ============================================================

INSERT INTO WORKER_MAIL_SIGNATURE_REGISTRY 
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('default_v1', 'EN', 'src/templates/shared/signatures/en/raw/AlahlyINV_Signature.htm', 'Y', SYSTIMESTAMP);

INSERT INTO WORKER_MAIL_SIGNATURE_REGISTRY 
  (SIGNATURE_KEY, LANGUAGE_CODE, SIGNATURE_FILE, IS_ACTIVE, CREATED_AT)
VALUES
  ('default_v1', 'AR', 'src/templates/shared/signatures/ar/raw/AlahlyINV_Signature.htm', 'Y', SYSTIMESTAMP);

COMMIT;
