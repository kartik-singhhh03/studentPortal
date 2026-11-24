# NOTES — Es Magico Student Results Portal

## Stack and why

- **Next.js App Router + TypeScript**: one codebase for UI and APIs; Route Handlers replace a separate Express server.
- **Neon PostgreSQL + Prisma 6 + `@prisma/adapter-neon`**: managed Postgres with pooled runtime connections and direct URL for migrations.
- **Zod + csv-parse + Vitest**: shared validation, robust CSV parsing, and regression tests around import behaviour.

## Important decisions

1. **Duplicate IDs in one file:** first occurrence wins even if invalid; later rows are `DUPLICATE_ID`. Source: assignment sample README / DATA_CONTRACT. Not “first valid wins”.
2. **Identical file re-upload:** SHA-256 hash; return `SKIPPED_IDENTICAL` without reprocessing.
3. **Cross-file duplicates:** upsert by normalized student ID.
4. **Skipped rows:** blank/empty-field lines are skipped and **not** included in `totalRows`. UI shows them separately from accepted/rejected.
5. **Grading:** one module (`src/lib/grading.ts`) — A/B/C/D/F bands, pass requires ≥40% overall and ≥35 in every subject.
6. **Frontend:** Server Components for data pages; Client Components only for upload/search/nav. Monochrome SaaS UI.

## What is missing / next

- Optional background job queue for very large imports.
- Auth / role-based access for administrators.
- Richer dashboard charts (kept intentionally simple).
- Full end-to-end persist of the 5,000-row sample in CI (validation acceptance is covered).

## How to run

See README. Use `.env.example` → `.env` with Neon pooled + unpooled URLs, then `npm install`, `npx prisma migrate deploy`, `npm run dev`.
