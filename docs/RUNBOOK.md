# Runbook

Operational guide for managing the `email-worker` service in production.

---

## Service Management (systemd)

The worker runs as a systemd service managed by a privileged user (e.g. `phadmin`).

```bash
# Start
sudo systemctl start email-worker

# Stop
sudo systemctl stop email-worker

# Restart (required after any code change)
sudo systemctl restart email-worker

# View status
sudo systemctl status email-worker

# View live logs
sudo journalctl -u email-worker -f

# View last 100 lines
sudo journalctl -u email-worker -n 100 --no-pager

# View logs since a specific time
sudo journalctl -u email-worker --since "2026-03-12 08:00:00"

# Enable auto-start on boot
sudo systemctl enable email-worker

# Disable auto-start on boot
sudo systemctl disable email-worker
```

Alternatively, from the project directory (requires the `app` user to be in sudoers):
```bash
npm run service:restart
npm run service:status
npm run service:logs
```

---

## Deploying Code Changes

```bash
# 1. Pull latest code (as app user)
cd /home/app/apps/projects/email-worker
git pull

# 2. Install new dependencies if package.json changed
npm install

# 3. Restart service (as privileged user)
sudo systemctl restart email-worker

# 4. Verify
sudo systemctl status email-worker
sudo journalctl -u email-worker -n 50 --no-pager
```

---

## Manual Re-run

**Force retry of an entire day:**
```sql
UPDATE WORKER_EXECUTION SET STATUS='FAILED' WHERE CLOSE_DATE='20260209';
COMMIT;
-- Worker will pick it up on the next poll and retry all reports
```

**Force retry of specific failed reports only (PARTIAL mode):**
Leave `STATUS='PARTIAL'` — the worker will automatically retry only the retryable failed reports.

---

## Checking Execution State

**View all execution records:**
```sql
SELECT CLOSE_DATE, STATUS, STARTED_AT, FINISHED_AT, ERROR_CODE, ERROR_MSG
FROM WORKER_EXECUTION
ORDER BY STARTED_AT DESC;
```

**View report-level results for a specific day:**
```sql
SELECT REPORT_ID, DOMAIN, STATUS, ROW_COUNT, ERROR_CODE, ERROR_MSG, ATTEMPT_NO
FROM WORKER_REPORT_LOG
WHERE CLOSE_DATE = '20260209'
ORDER BY STARTED_AT;
```

**View only failed reports:**
```sql
SELECT * FROM WORKER_REPORT_LOG
WHERE STATUS = 'FAILED' AND CLOSE_DATE = '20260209';
```

---

## Log Files

| Source | Contents |
|---|---|
| `sudo journalctl -u email-worker` | systemd journal (production) |
| `logs/worker.log` | All log levels (Winston) |
| `logs/error.log` | Errors only (Winston) |

---

## Troubleshooting

| Problem | What to check |
|---|---|
| Worker not starting | `.env` config, Oracle connectivity, `journalctl` logs |
| Report `FAILED` | `WORKER_REPORT_LOG.ERROR_CODE` and `ERROR_MSG` |
| Retryable failure | Auto-retried once. Check `ATTEMPT_NO` in `WORKER_REPORT_LOG` |
| Non-retryable failure | Fix root cause, then force retry via `UPDATE WORKER_EXECUTION` |
| Email not sent | `SMTP_*` env vars; check if `isDryRun=true` in startup log |
| Stale `RUNNING` state | Bootstrap auto-recovers on restart (`STALE_TIMEOUT_MIN`) |
| `app is not in sudoers` | Use a privileged user (e.g. `phadmin`) for `systemctl` commands |

---

## systemd Service File

Located at `/etc/systemd/system/email-worker.service`.
Source copy: `email-worker.service` in the project root.

After editing the service file:
```bash
sudo systemctl daemon-reload
sudo systemctl restart email-worker
```

---

## Environment Files (dotenv-flow)

The worker uses `dotenv-flow` which loads files in this priority order:

```
.env
.env.local              (gitignored)
.env.<NODE_ENV>
.env.<NODE_ENV>.local   (gitignored — store secrets here)
```

Secrets (`DB_PASSWORD`, `SMTP_PASS`) should live in `.env.production.local` which is gitignored.
