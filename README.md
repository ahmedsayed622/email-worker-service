# email-worker

A production-grade Node.js background worker that polls an Oracle database for day-close events and automatically generates, exports, and emails daily financial reports.

---

## Features

- Polls Oracle DB for multiple trigger types (Operations, Finance, Compliance close events)
- Generates reports as **XLSX** and **CSV** attachments
- Sends bilingual emails (**Arabic / English**) via SMTP with branded signatures
- **Dry-run mode** — runs without SMTP config, logs everything without sending
- **Crash recovery** — auto-resumes stale/interrupted runs on startup
- **Per-report retry** — retryable failures are retried automatically; non-retryable failures are isolated
- Full audit trail in Oracle (`WORKER_EXECUTION`, `WORKER_REPORT_LOG`)
- Hexagonal (Ports & Adapters) architecture — domain logic is fully decoupled from infrastructure

---

## Architecture

The service follows a **Hexagonal-lite (Ports & Adapters)** pattern:

```
Core (domain logic + ports)   — never imports adapters
Adapters (Oracle, SMTP, FS)   — implement Core ports
App/Bootstrap                  — wires adapters into core via DI
Shared (logger, errors)        — cross-cutting, importable by all
Config (env.js)                — environment validation, importable by all
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for full details including port contracts, DB schema, and job flow diagram.

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 18+ |
| Oracle Instant Client | 19.x |
| Oracle DB | accessible via TNS or Easy Connect |

---

## Installation

```bash
git clone <repo-url>
cd email-worker
npm install
cp .env.example .env
# Edit .env with your credentials
```

---

## Configuration

All configuration is via environment variables. Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_USER` | Yes | — | Oracle DB username |
| `DB_PASSWORD` | Yes | — | Oracle DB password |
| `DB_CONNECT_STRING` | Yes | — | Oracle connection string (TNS or EZConnect) |
| `ORACLE_CLIENT_PATH` | No | `null` | Path to Oracle Instant Client (if not in `LD_LIBRARY_PATH`) |
| `ORA_POOL_MIN` | No | `2` | Oracle connection pool minimum |
| `ORA_POOL_MAX` | No | `10` | Oracle connection pool maximum |
| `POLL_INTERVAL_MS` | No | `60000` | Polling interval in milliseconds |
| `REPORTS_OUTPUT_DIR` | No | `./data/reports` | Local output directory for exported files |
| `MAX_RETRY_ATTEMPTS` | No | `2` | Max retry attempts for retryable failures |
| `STALE_TIMEOUT_MIN` | No | `30` | Minutes before a RUNNING state is considered stale |
| `LOG_LEVEL` | No | `info` | Winston log level (`debug`, `info`, `warn`, `error`) |
| `LOG_DIR` | No | `./logs` | Directory for log files |
| `SMTP_HOST` | No | `null` | SMTP server host. If unset, runs in dry-run mode |
| `SMTP_PORT` | No | `null` | SMTP port |
| `SMTP_SECURE` | No | `false` | Use TLS (`true`/`false`) |
| `SMTP_USER` | No | `null` | SMTP auth username |
| `SMTP_PASS` | No | `null` | SMTP auth password |
| `SMTP_FROM` | No | `null` | From address for sent emails |
| `SMTP_ALLOW_INSECURE` | No | `false` | Disable TLS certificate verification |
| `ADMIN_EMAIL` | No | `null` | Admin email to notify on non-retryable failures |
| `NOTIFY_ON_FAILURE` | No | `true` | Send admin notification on failure |
| `DEFAULT_EMAIL_LANGUAGE` | No | `EN` | Default email language (`EN` or `AR`) |

> **Dry-run mode:** If `SMTP_HOST` is not set, the worker runs in dry-run mode — all report generation runs normally but emails are logged instead of sent. Useful for testing.

---

## Running

### Development
```bash
npm run dev
# or
npm run start:dev
```
Uses `node --watch` for automatic restart on file changes.

### Production (systemd)
```bash
# Start
sudo systemctl start email-worker

# Stop
sudo systemctl stop email-worker

# Restart after code changes
sudo systemctl restart email-worker

# View status
sudo systemctl status email-worker

# View live logs
sudo journalctl -u email-worker -f
```

### Production (PM2)
```bash
pm2 start ecosystem.config.cjs
pm2 restart email-worker
pm2 logs email-worker
```

---

## Project Structure

```
email-worker/
├── src/
│   ├── app/
│   │   ├── worker.js          # Entry point — sequential poll loop
│   │   └── bootstrap.js       # DI wiring — creates and connects all adapters
│   ├── core/
│   │   ├── shared/
│   │   │   ├── usecases/      # executeReports.js — main execution logic
│   │   │   ├── ports/         # Port contracts (JSDoc interfaces)
│   │   │   ├── triggers/      # Trigger registry + plugins (ops/fin/cmp)
│   │   │   ├── domain/        # Report loader, email template builder
│   │   │   └── validation/    # Report contract & close date validation
│   │   ├── finance/
│   │   │   ├── reports/       # *.report.js configs
│   │   │   └── sql/           # *.sql query files
│   │   ├── compliance/
│   │   │   ├── reports/
│   │   │   └── sql/
│   │   └── operations/
│   │       ├── reports/
│   │       └── sql/
│   ├── adapters/
│   │   ├── db/                # Oracle pool + DB adapters + trigger adapters
│   │   ├── export/            # XLSX / CSV export
│   │   ├── email/             # SMTP adapter + dry-run adapter
│   │   └── fs/                # Filesystem adapter
│   ├── templates/
│   │   ├── engine/            # Template loader and HTML renderer
│   │   └── shared/
│   │       ├── emails/        # data.ar.html, data.en.html, no_data.*.html
│   │       └── signatures/    # ar/ and en/ branded HTML signatures
│   ├── config/
│   │   └── env.js             # Environment validation and export
│   └── shared/
│       ├── logger/            # Winston logger
│       └── errors/            # AppError + normalizeError
├── docs/                      # Architecture, runbook, and policy docs
├── logs/                      # Runtime log files (gitignored)
├── data/                      # Local report output (gitignored)
├── ecosystem.config.cjs       # PM2 configuration
├── email-worker.service       # systemd unit file
└── package.json
```

---

## Adding a New Report

1. Add a SQL file under `src/core/<domain>/sql/`
2. Add a `*.report.js` config under `src/core/<domain>/reports/` with:
   - `id` — unique report identifier
   - `triggerType` — which trigger fires this report (`OPS_CLOSE`, `FIN_CLOSE`, `CMP_CLOSE`)
   - `sql` — relative path to the SQL file
   - `recipients` — array of email addresses
   - `requiredParams` — `['close_date']` for date-filtered reports, `[]` for full-table reports
   - `format` — `xlsx`, `csv`, or both

---

## Adding a New Domain

1. Create a folder under `src/core/<domain>/`
2. Add `index.js` that exports `{ domain, reports, hooks }`
3. Add trigger adapter under `src/adapters/db/triggers/`
4. Register a trigger plugin in `src/app/bootstrap.js`

---

## Logs

| File | Contents |
|---|---|
| `logs/worker.log` | All log levels |
| `logs/error.log` | Errors only |
| `journalctl -u email-worker` | systemd journal (production) |

---

## Manual Operations

**Force retry for a specific day:**
```sql
UPDATE WORKER_EXECUTION SET STATUS='FAILED' WHERE CLOSE_DATE='20260209';
-- Worker will retry on next poll
```

**Check failed reports:**
```sql
SELECT * FROM WORKER_REPORT_LOG
WHERE STATUS = 'FAILED' AND CLOSE_DATE = '20260209';
```

---

## License

Internal use only.
