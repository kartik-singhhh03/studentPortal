# NOTES — Es Magico Student Results Portal

## Stack and why

Next.js App Router + TypeScript for UI and APIs in one repo. Neon PostgreSQL with Prisma 6 + `@prisma/adapter-neon` for pooled serverless queries and a direct URL for migrations. Zod + csv-parse for validation/parsing; Vitest for regressions. Monochrome Tailwind UI—no extra UI framework.

## Data model and API

`Student` (unique `studentId`), `ImportBatch` (hash + counters + status), `ImportError` (row-level reasons). REST Route Handlers under `/api/*`. Partial unique index on `fileHash` for active/successful batches so FAILED history can share a hash.

## Valid vs invalid rows

A valid row passes required fields, formats, ranges, and age rules (see DATA_CONTRACT). Administrators see rejected rows with field, code, message, and rejected value; formula-safe CSV download available. Blank lines are **skipped** and counted separately—not in `totalRows`.

## Duplicates and identical files

In one file, **first occurrence wins** (even if invalid); later IDs are `DUPLICATE_ID`. Cross-file: upsert by normalized ID. Identical bytes (SHA-256): `SKIPPED_IDENTICAL` if a COMPLETED batch exists. FAILED imports are retryable via a **new** PROCESSING batch; concurrent identical uploads get `409 IMPORT_IN_PROGRESS`. Progress uses atomic `importedRows` increments.

## Bad files and large imports

Non-CSV / empty / oversized files are rejected before parse. Default max upload is **4 MiB** (under Vercel’s ~4.5 MB body limit). Large imports use bounded concurrent upserts; `POST /api/imports` allows up to 60s on supporting plans. Multi-minute background queues are intentionally out of scope.

## Grading

`src/lib/grading.ts` only: A/B/C/D/F bands; pass needs ≥40% overall and ≥35 in every subject.

## Build order / intentional omissions

Foundation → import engine → portal UI → acceptance/recovery → polish/Vercel docs. Omitted: auth (not required), queues, Blob storage for huge files. Auth should be added before any public school deployment.

## Remaining limitations

Hobby Vercel duration may timeout on full 5k-row sync imports; prefer Pro or smaller files for demos. No auth. Upserts from a failed mid-import are not rolled back (honest FAILED counters + safe retry).
