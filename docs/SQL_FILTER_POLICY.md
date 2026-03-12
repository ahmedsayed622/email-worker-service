# SQL Filter Policy

**Date:** February 25, 2026  
**Project:** email-worker

---

## Overview

Some reports in this system are **intentionally configured to run without close_date filter parameters**. This is a business requirement, not a configuration error or missing implementation.

Reports with `requiredParams: []` will execute their SQL queries without date-based filtering, returning all available data from the source tables. This behavior is by design for specific operational and financial reporting needs.

---

## Reports Without close_date Filter

| Domain | Report File Path | requiredParams | Policy Note |
|--------|------------------|----------------|-------------|
| Operations | `src/core/operations/reports/dailyOperations.report.js` | `[]` | No close_date filter by design |
| Finance | `src/core/finance/reports/dailyTrading.report.js` | `[]` | No close_date filter by design |

---

## Reports WITH close_date Filter

For reference, the following reports **do require** close_date filtering:

| Domain | Report File Path | requiredParams |
|--------|------------------|----------------|
| Finance | `src/core/finance/reports/dailyConfirmation.report.js` | `['close_date']` |
| Finance | `src/core/finance/reports/dailySettlements.report.js` | `['close_date']` |
| Compliance | `src/core/compliance/reports/dailyCompliance.report.js` | `['close_date']` |

---

## Implementation Notes

- **No SQL files were modified** as part of this policy documentation.
- Reports with `requiredParams: []` will **not** pass `:close_date` bind variable to Oracle.
- The SQL queries in these reports are intentionally written to return unfiltered data.
- Bootstrap validation accepts empty `requiredParams` arrays as valid configuration.

---

## Business Justification

Reports without date filters serve specific operational purposes:
1. **Historical Data Aggregation:** Some reports need access to all available data regardless of date
2. **System State Snapshots:** Operational reports may reflect current system state rather than daily deltas
3. **Cross-Date Analysis:** Financial reports may require multi-period data for reconciliation

---

## Maintenance Guidelines

When reviewing report configurations:
- `requiredParams: []` with business requirement comment → **Correct, do not change**
- `requiredParams: []` without explanation → **May need review**
- `requiredParams: ['close_date']` → **Standard daily report pattern**

Do not add `:close_date` placeholders to SQL files that have `requiredParams: []` unless explicitly requested by business stakeholders.
