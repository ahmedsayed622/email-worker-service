-- ============================================================
-- Seed: WORKER_MAIL_ADDRESS
-- Production recipient email addresses
-- ============================================================

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
