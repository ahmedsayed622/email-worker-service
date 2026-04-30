-- ============================================================
-- WORKER_MAIL_RECIPIENTS_V — Resolves rule recipients across
-- direct EMAIL targets and GROUP membership.
--
-- NOTE: Definition reconstructed from runtime usage. Verify
-- against production before deploying.
-- ============================================================

CREATE OR REPLACE VIEW BACK_OFFICE.WORKER_MAIL_RECIPIENTS_V AS
SELECT
  t.rule_id,
  t.recip_type,
  a.address AS email_address,
  'EMAIL'   AS source_kind
FROM back_office.WORKER_MAIL_RULE_TARGET t
JOIN back_office.WORKER_MAIL_ADDRESS a
  ON t.target_kind = 'EMAIL'
 AND t.address_id  = a.address_id
WHERE t.is_active = 'Y'
  AND a.is_active = 'Y'

UNION ALL

SELECT
  t.rule_id,
  t.recip_type,
  am.address AS email_address,
  'GROUP'    AS source_kind
FROM back_office.WORKER_MAIL_RULE_TARGET t
JOIN back_office.WORKER_MAIL_GROUP_MEMBER gm
  ON t.target_kind = 'GROUP'
 AND t.group_id    = gm.group_id
JOIN back_office.WORKER_MAIL_ADDRESS am
  ON gm.address_id = am.address_id
WHERE t.is_active  = 'Y'
  AND gm.is_active = 'Y'
  AND am.is_active = 'Y';
