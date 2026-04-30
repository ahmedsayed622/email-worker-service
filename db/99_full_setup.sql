-- ============================================================
-- Master setup script — runs all DDL + seed in correct order.
--
-- Usage (SQL*Plus / SQLcl):
--   cd /path/to/email-worker
--   sqlplus user/pwd@db @db/99_full_setup.sql
--
-- Prerequisites:
--   * BACK_OFFICE_TS tablespace exists.
--   * Connected as the BACK_OFFICE schema owner (or a user with
--     CREATE ANY TABLE / CREATE PUBLIC SYNONYM privileges).
--
-- This script intentionally does NOT drop existing objects.
-- Run a cleanup script first if you need to re-apply.
-- ============================================================

SET ECHO ON
SET DEFINE OFF
WHENEVER SQLERROR EXIT FAILURE

-- ─────────────────────────────────────────────────────────────
-- 1. Synonyms
-- ─────────────────────────────────────────────────────────────
@@db/00_setup/02_create_synonyms.sql

-- ─────────────────────────────────────────────────────────────
-- 2. Tables (worker first, then compliance)
-- ─────────────────────────────────────────────────────────────
@@db/01_tables/WORKER_EXECUTION.sql
@@db/01_tables/WORKER_REPORT_LOG.sql
@@db/01_tables/WORKER_MAIL_ADDRESS.sql
@@db/01_tables/WORKER_MAIL_GROUP.sql
@@db/01_tables/WORKER_MAIL_GROUP_MEMBER.sql
@@db/01_tables/WORKER_MAIL_RULES.sql
@@db/01_tables/WORKER_MAIL_RECIPIENTS.sql
@@db/01_tables/WORKER_MAIL_RULE_TARGET.sql
@@db/01_tables/WORKER_MAIL_TEMPLATE_REGISTRY.sql
@@db/01_tables/WORKER_MAIL_SIGNATURE_REGISTRY.sql
@@db/01_tables/CMP_CLIENTS_TBL_DOB.sql
@@db/01_tables/CMP_CLIENTS_TBL_CTRL_DOB.sql

-- ─────────────────────────────────────────────────────────────
-- 3. Views
-- ─────────────────────────────────────────────────────────────
@@db/02_views/WORKER_MAIL_RECIPIENTS_V.sql

-- ─────────────────────────────────────────────────────────────
-- 4. Procedures
-- ─────────────────────────────────────────────────────────────
@@db/03_procedures/CMP_CLIENTS_PRO_DOB.sql
@@db/03_procedures/cmp_emp_pro_daily_orders.sql
@@db/03_procedures/WORKER_EMAIL_MANAGE.sql
@@db/03_procedures/WORKER_GROUP_MANAGE.sql

-- ─────────────────────────────────────────────────────────────
-- 5. Scheduler jobs
-- ─────────────────────────────────────────────────────────────
@@db/04_jobs/MONTH_START_DOB_JOB.sql

-- ─────────────────────────────────────────────────────────────
-- 6. Seed data
-- ─────────────────────────────────────────────────────────────
@@db/05_seed/templates.sql
@@db/05_seed/signatures.sql
@@db/05_seed/mail_addresses.sql
@@db/05_seed/mail_groups.sql
@@db/05_seed/mail_rules.sql

PROMPT ============================================================
PROMPT  Email Worker setup complete.
PROMPT  Run db/05_seed/_validation.sql to verify routing.
PROMPT ============================================================
