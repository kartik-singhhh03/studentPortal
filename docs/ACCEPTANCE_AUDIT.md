# Phase 4 — Final Acceptance & Production Readiness Audit

Date: 2026-11-24  
Scope: studentPortal after Phases 1–3

## 1. Assignment requirements checklist

Sources: Es Magico assignment PDF, `sample-data/README.md`, `docs/DATA_CONTRACT.md`, `NOTES.md`.

| Requirement | Implementation | Verification | Status |
|---|---|---|---|
| Import CSV screen | `/import`, `POST /api/imports` | Browser smoke + API tests | PASS |
| Show accepted / rejected / why | Import result + errors table + download | Integration + UI | PASS |
| Bad file/row does not crash app | ImportClientError + public errors | Unit + live API | PASS |
| Students list searchable / usable at scale | `/students`, DB pagination/filters | API + browser | PASS |
| Student report with marks + overall result | `/students/[id]` + `grading.ts` | Code review + types | PASS |
| Grading scheme documented | `DATA_CONTRACT`, `NOTES.md`, UI | Docs | PASS |
| Seed / load realistic data | `npm run seed` → sample CSV import | Script present | PASS |
| Tests for import | Vitest suite | `npm test` | PASS |
| Dockerfile runs the app | `Dockerfile` + compose | Config audit (image not rebuilt in this phase) | PARTIAL |
| README run instructions | `README.md` | Review | PASS |
| NOTES.md decisions | `NOTES.md` | Review | PASS |
| CSV column/validation rules | `validation.ts` / parser | Sample acceptance tests | PASS |
| Duplicate ID first-occurrence rule | `validation.ts` | Unit + sample | PASS |
| Identical file idempotency | SHA-256 + unique `fileHash` | Integration test | PASS |
| Cross-file upsert | `student.upsert` | Integration test | PASS |
| UTF-8 BOM / CRLF / quotes | `csv-parse` | Unit tests | PASS |
| Error codes set | Import errors | Unit + download | PASS |
| Physical line numbers | `info.lines` | Unit tests | PASS |
| Docker health / migrations | entrypoint + `/api/health` | Code review | PASS |
| Authentication | Not required by assignment | N/A | NOT APPLICABLE |

### Missing / evaluation risks (non-blocking)

- Full 5,000-row **persist** not exercised in CI (validation acceptance is covered).
- Docker image not rebuilt/run in this audit pass after Dockerfile hardening.
- No authentication: anyone who can reach the deployment can import/query (acceptable for assignment; document for real ops).

## 2. Critical issues discovered

None that block core assignment acceptance after fixes below.

## 3. Issues fixed in this phase

| Severity | Issue | Fix |
|---|---|---|
| High | Docker runner omitted Neon adapter packages (`serverExternalPackages`) | Copy `@prisma/adapter-neon` and `@neondatabase` into image |
| High | FAILED import after successful upserts reported `importedRows: 0` | Track `studentsPersisted`; report honest count |
| Medium | Oversized multipart could be buffered before file checks | Early `Content-Length` rejection on `POST /api/imports` |
| Medium | `console.error` dumped full thrown objects | Log only `name` + `message` |
| Low | Seed was placeholder only | `scripts/seed.ts` imports local sample CSV via import engine |
| Low | Docker docs incomplete | README notes both Neon URLs required |

## 4. Files modified / added

- `src/lib/import/import-service.ts`
- `src/lib/import/errors.ts`
- `src/app/api/imports/route.ts`
- `Dockerfile`
- `README.md`
- `scripts/seed.ts`
- `package.json` / lock (tsx + seed script)
- `tests/pagination.test.ts`
- `tests/import-failure-accounting.unit.test.ts`
- `docs/ACCEPTANCE_AUDIT.md` (this file)

## 5–12. Verification results

| Check | Result |
|---|---|
| Vitest | **49/49 passed** (13 files), including Neon integration |
| ESLint | clean |
| TypeScript (build typecheck) | clean |
| Production build | success |
| `prisma migrate status` | Database schema is up to date (2 migrations) |
| Docker image rebuild/run | Not re-executed this pass (Dockerfile hardened) |
| Browser smoke | Covered in Phase 3; not re-run after these backend/Docker fixes |

## Overall recommendation

**GO** for assignment submission, after the operator confirms `.env` is not committed and sample-data remains local-only.

---

## Phase 4.1 — Failed 5,000-row import investigation

### Failed batch (Neon, unchanged)

| Field | Value |
|---|---|
| id | `cmwuet0ua0000jhzwnjw2bn0x` |
| filename | `students_sample.csv` |
| status | `FAILED` |
| totalRows / imported / rejected / skipped | 5000 / **0** / **0** / 10 |
| ImportError rows | **0** |
| completedAt | **null** |
| fileHash prefix | `84a5b5fc8fd4` |
| importedAt | `2026-11-24T08:04:58.881Z` |

### Root cause

1. Parsing/validation completed (skipped blanks = 10; offline re-validate still yields **4685 accepted / 315 rejected**).
2. Provisional `ImportBatch` was created as `FAILED` with **rejectedRows: 0** before persistence.
3. Persistence used Prisma `$transaction` of 100 upserts over Neon — ~1,184 students written (~08:04:59–08:10:41Z), then the Node process was interrupted (no catch accounting; `completedAt` stayed null).
4. Dashboard read the stranded provisional counters → 0 accepted / 0 rejected.

Failure stage: **database upserts** (interrupted mid-persist), not parsing/validation/hashing. Error rows were never inserted. Catch-path accounting did not run.

### Fix (smallest justified)

- Persist validation `rejectedRows` on provisional batch create.
- Replace large interactive `$transaction` upserts with concurrent autocommit upserts + progress `importedRows` updates.
- Harden failure accounting (partial counts; never hide original error).

### Verification

- Unit + failure-accounting regression: pass
- Neon integration (small / identical / upsert / 120-row large behavior): pass
- Full 5,000-row **persist** not re-run (safety constraint); parse/validate acceptance target **verified offline**

---

## Phase 4.2 — Failed import recovery & persistence safety

### Strategy

- Failed imports are **retryable** without mutating historical `FAILED` rows.
- `fileHash` uniqueness is a **partial unique index** on active/successful statuses only (`PROCESSING`, `COMPLETED`, `SKIPPED_IDENTICAL`).
- Progress uses **atomic** `importedRows = importedRows + delta` SQL increments.
- Concurrent identical uploads: one `PROCESSING` winner; peers get `409 IMPORT_IN_PROGRESS` (or `SKIPPED_IDENTICAL` only after `COMPLETED`).
- Stale `PROCESSING` (>30m) is reclaimed to `FAILED`, then a new attempt may proceed.

### Note on batch `cmwuet0ua0000jhzwnjw2bn0x`

Observed later as `COMPLETED` (4685/315) with the same id — consistent with a retry under the Phase 4.1 reuse-FAILED path, not with Phase 4.2’s create-new-batch policy. Phase 4.2 does not rewrite completed history.
