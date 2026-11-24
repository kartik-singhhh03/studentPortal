# Architecture — Phase 1

## Stack

- **Next.js 15 App Router** (Node.js runtime for DB and CSV routes; no Edge for those handlers)
- **React 19 + TypeScript**
- **Tailwind CSS 4** + Lucide React (UI in a later phase)
- **Neon PostgreSQL + Prisma 6** (`prisma-client-js` + `@prisma/adapter-neon` / `PrismaNeon`)
- Runtime uses pooled `DATABASE_URL`; migrations use direct `DATABASE_URL_UNPOOLED`
- **csv-parse** for robust CSV parsing
- **Zod** for request/query and shared field validation
- **Vitest** for unit tests of validation and grading
- **Docker** with Next.js `output: "standalone"`; Neon env vars injected at runtime

No Express, FastAPI, or Python services.

## Layering

| Layer | Responsibility |
|---|---|
| `src/app/**/page.tsx` | Server Components for data display; Client Components only for interactive forms/filters |
| `src/app/api/**/route.ts` | REST Route Handlers; validate input; call services; map errors to HTTP |
| `src/lib/csv` | Parse file bytes, map headers, yield row records with physical line numbers |
| `src/lib/validation` | Shared Zod schemas and row validation (single source of truth) |
| `src/lib/grading.ts` | Percentage, letter grade, pass/fail |
| `src/lib/prisma.ts` | Prisma client singleton |
| `prisma/schema.prisma` | Relational schema |

Business rules must not live inside React components.

## Database decisions

1. **Within one file**: first normalized `student_id` wins; later rows → `DUPLICATE_ID`. The first sighting still reserves the ID even if that row is otherwise invalid.
2. **Across files**: valid rows **upsert** by normalized `student_id`.
3. **Identical re-upload**: SHA-256 of file bytes; unique `ImportBatch.fileHash`; status `SKIPPED_IDENTICAL`; no reprocessing.
4. **No permanent CSV storage**: only batch metadata and error rows.
5. **Marks**: stored as floats; grades computed on read via `grading.ts`, not denormalized columns (keeps one grading source of truth).

## API design

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/imports` | Upload CSV (`multipart/form-data`); process import |
| `GET` | `/api/imports/:importId` | Import batch summary |
| `GET` | `/api/imports/:importId/errors` | Paginated import errors |
| `GET` | `/api/students` | Search, grade filter, pagination, total count (DB-side) |
| `GET` | `/api/students/:studentId` | Single student + computed grading |
| `GET` | `/api/health` | Liveness + database connectivity |

### Students list query parameters (planned)

- `q` — search name or student ID (case-insensitive contains)
- `gradeLevel` — optional integer 1–12
- `page` — 1-based page index
- `pageSize` — configurable, with a server-enforced maximum

Never load the full student table into the browser for filtering.

## Security and reliability

- Prisma only on the server.
- Generic error messages to clients; details logged server-side.
- Validate upload MIME/extension; enforce `MAX_UPLOAD_BYTES`.
- `.env*` and `sample-data/` are gitignored.
- Neon credentials stay in ignored env files; Docker receives them at runtime.

## Frontend design system (Phase 2+)

Recorded for implementation; not built in Phase 1.

- Palette: `#171717`, `#404040`, `#737373`, `#E5E5E5`, `#FAFAFA`, `#FFFFFF`
- Minimal monochrome SaaS dashboard; Geist typography; thin borders; restrained semantic colours only for success/warning/error
- Avoid gradients, neon, glassmorphism, heavy animation, oversized rounded cards

## Planned screens (later phases)

1. Import CSV
2. Students list
3. Student detail

Phase 1 ships architecture, schema, docs, and a minimal shell only.
