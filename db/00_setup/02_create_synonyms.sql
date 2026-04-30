-- ============================================================
-- Public synonyms for compliance staging tables.
-- Allows the worker DB user to query the tables without a
-- schema prefix. Owner schema is BACK_OFFICE.
-- ============================================================

CREATE OR REPLACE PUBLIC SYNONYM CMP_CLIENTS_TBL_DOB
  FOR BACK_OFFICE.CMP_CLIENTS_TBL_DOB;

CREATE OR REPLACE PUBLIC SYNONYM CMP_CLIENTS_TBL_CTRL_DOB
  FOR BACK_OFFICE.CMP_CLIENTS_TBL_CTRL_DOB;

-- Note:
--   WORKER_* tables intentionally do NOT have public synonyms.
--   Application code references them as back_office.WORKER_*.
