# Architecture

## Overview
The `email-worker` service is a long-running Node.js process that polls Oracle for day-close events and generates daily financial reports, exporting files and emailing them to recipients. The codebase follows a Hexagonal-lite (Ports & Adapters) architecture to keep domain logic isolated from infrastructure concerns while enabling clear dependency boundaries.

## Dependency Rule
```
Core 🚫 CANNOT import Adapters
Adapters ✅ implement Ports defined in Core
App (Bootstrap) ✅ wires Adapters into Core via dependency injection
Shared ✅ can be imported by anyone (logger, errors)
Config ✅ can be imported by anyone (env)
```

## Folder Structure
```
email-worker/
├── src/
│   ├── app/                          # bootstrap wiring + worker poller
│   ├── core/
│   │   ├── shared/
│   │   │   ├── usecases/             # executeDayClose.js
│   │   │   ├── ports/                # Port contracts (JSDoc)
│   │   │   └── domain/               # report naming, loaders, email template
│   │   ├── finance/
│   │   │   ├── reports/              # *.report.js configs
│   │   │   └── sql/                  # *.sql query files
│   │   ├── compliance/
│   │   │   ├── reports/
│   │   │   └── sql/
│   │   └── operations/
│   │       ├── reports/
│   │       └── sql/
│   ├── adapters/
│   │   ├── db/                       # oraclePool + db adapters
│   │   ├── export/                   # xlsx/csv export
│   │   ├── email/                    # smtp + dry-run
│   │   └── fs/                       # filesystem adapter
│   ├── config/                       # env.js
│   └── shared/
│       ├── logger/                   # Winston logger
│       └── errors/                   # AppError + normalizeError
├── docs/                             # ARCHITECTURE.md, RUNBOOK.md, AI_BEHAVIOR.md
└── data/                             # local dev output
    └── reports/
```

## Ports
| Port | Methods |
|---|---|
| DayClosePort | `getLatestCloseDate()` |
| RunStatePort | `claim()`, `markDone()`, `markFailed()`, `markPartial()`, `getFailedReports()`, `recoverStuckRuns()` |
| ReportQueryPort | `fetchData(sqlPath, params)` |
| ExportPort | `generate(rows, config)` |
| EmailPort | `send({ to, subject, body, attachments })` |
| AuditPort | `log(closeDate, reportId, status, details)` |

## Adapters
| Adapter | Port |
|---|---|
| `dayClose.adapter.js` | DayClosePort |
| `runState.adapter.js` | RunStatePort |
| `reportQuery.adapter.js` | ReportQueryPort |
| `audit.adapter.js` | AuditPort |
| `export/index.js` | ExportPort |
| `email/smtp.adapter.js` | EmailPort |
| `email/dryRun.adapter.js` | EmailPort |
| `fs/fileStore.js` | FileStore (utility used by engine) |

## Error Handling
**Layer 1 (Per-Report):** Each report is executed inside its own try/catch. Errors are normalized with `normalizeError()` and audited with retryable flags.

**Layer 2 (Global Wrapper):** The poller wraps each tick. If an unexpected error occurs, it is normalized and the day is marked `FAILED`.

**normalizeError Mapping**
| Condition | Code | Retryable |
|---|---|---|
| Oracle error (`errorNum` or `ORA-`) | `DB_ORACLE` | Only for specific retryable codes |
| Pool/connection error | `DB_POOL_DOWN` | Yes |
| File missing | `SQL_FILE_MISSING` | No |
| Email send errors | `EMAIL_SEND_FAILED` | Yes |
| Export errors | `EXPORT_FAILED` | No |
| Default | `UNEXPECTED` | No |

## Job Flow
```
Poll tick
  ├─ Get latest close date (END_OF_DAY)
  ├─ Claim close date in WORKER_EXECUTION
  │   ├─ New → RUNNING → proceed full
  │   ├─ DONE/RUNNING → skip
  │   ├─ FAILED → reset to RUNNING → proceed full
  │   └─ PARTIAL → load failed retryables → proceed partial
  └─ Execute reports (per report)
      ├─ Fetch data (SQL)
      ├─ Process hooks (optional)
      ├─ Export (XLSX/CSV)
      ├─ Send email
      └─ Audit result
  └─ Mark day state (DONE / PARTIAL / FAILED)
  └─ Notify admin on non-retryable failures (optional)
```

## Database Tables
```sql
-- WORKER_EXECUTION
CLOSE_DATE    VARCHAR2(8)    PRIMARY KEY
STATUS        VARCHAR2(20)   NOT NULL
STARTED_AT    TIMESTAMP      DEFAULT SYSTIMESTAMP
FINISHED_AT   TIMESTAMP
UPDATED_AT    TIMESTAMP      DEFAULT SYSTIMESTAMP
ERROR_CODE    VARCHAR2(50)
ERROR_MSG     VARCHAR2(2000)
DETAILS       CLOB

-- WORKER_REPORT_LOG
ID            NUMBER         GENERATED ALWAYS AS IDENTITY PRIMARY KEY
CLOSE_DATE    VARCHAR2(8)    NOT NULL
REPORT_ID     VARCHAR2(50)   NOT NULL
DOMAIN        VARCHAR2(50)   NOT NULL
STATUS        VARCHAR2(20)   NOT NULL
ROW_COUNT     NUMBER
FILE_PATH     VARCHAR2(500)
ERROR_CODE    VARCHAR2(50)
ERROR_MSG     VARCHAR2(2000)
RETRYABLE     CHAR(1)        DEFAULT 'N'
ATTEMPT_NO    NUMBER         DEFAULT 1
STARTED_AT    TIMESTAMP      DEFAULT SYSTIMESTAMP
FINISHED_AT   TIMESTAMP
CONSTRAINT UK_REPORT_LOG UNIQUE (CLOSE_DATE, REPORT_ID)
```

## Adding a New Report
1. Add a SQL file under `src/core/<domain>/sql/`.
2. Add a matching `*.report.js` config under `src/core/<domain>/reports/`.

## Adding a New Domain
1. Create a domain folder under `src/core/` with an `index.js` export.
