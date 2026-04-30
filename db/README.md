# Database Layout (`db/`)

All Oracle DDL, procedures, jobs, and seed data live here. This directory replaces the old `sql/TABLE/` and the root-level `PRODUCTION_DATABASE_SETUP.sql`.

## Structure

```
db/
├── 00_setup/
│   └── 02_create_synonyms.sql       Public synonyms for CMP tables (consumed by the worker user)
├── 01_tables/                       One file per table (DDL only, no DML)
├── 02_views/                        One file per view
├── 03_procedures/                   One file per stored procedure
├── 04_jobs/                         DBMS_SCHEDULER jobs
├── 05_seed/                         Seed data (templates, signatures, mail rules, etc.)
└── 99_full_setup.sql                Master script (calls everything in order)
```

## Schema convention

| Object | Schema strategy |
|--------|-----------------|
| `CMP_CLIENTS_TBL_DOB`, `CMP_CLIENTS_TBL_CTRL_DOB` | **Public synonyms** — runtime SQL uses unqualified names. |
| `CMP_EMP_TBL_DAILY_ORDERS`, `BO_END_OF_DAY`, `BO_OMNI_END_OF_DAY` | **Public synonyms** (already exist in production). Runtime SQL still uses the `back_office.` prefix today; left as-is until a follow-up sweep. |
| `WORKER_*` tables/views | **`back_office.` prefix** in all runtime SQL — no synonyms defined for these. |

## Run order

The `99_full_setup.sql` master script applies files in this order:

1. `00_setup/02_create_synonyms.sql`
2. `01_tables/*.sql` (worker tables first, then compliance tables)
3. `02_views/*.sql`
4. `03_procedures/*.sql`
5. `04_jobs/*.sql`
6. `05_seed/*.sql`

## Idempotency

These files are written assuming a fresh schema. If you re-run them on an existing database you will get `ORA-00955` (object exists) or PK violations. Drop / cleanup the affected objects first.

## Open items / TODO

- `BACK_OFFICE_TS` tablespace must exist before running `01_tables/*.sql`.
- View `WORKER_MAIL_RECIPIENTS_V` definition was reconstructed from runtime usage; verify against production before re-deploying.
- Sequences for `RULE_ID`, `ADDRESS_ID`, `GROUP_ID`, etc. are not yet defined here — seeds use hard-coded IDs.
