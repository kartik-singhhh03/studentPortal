# Vercel deployment — Es Magico Student Results Portal

Target: **Vercel** (Node.js serverless) + **Neon PostgreSQL**.

Docker remains supported separately for local/self-hosted runs (`docker compose up --build`).

## 1. Import the repository

1. Push the project to GitHub (without `.env` or `sample-data/`).
2. In Vercel: **Add New Project** → import the repo.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: repository root (default).
5. Build command: `prisma generate && next build` (or keep default `next build`; `postinstall` already runs `prisma generate`).
6. Output: leave default. Do **not** set `DOCKER_BUILD=1` on Vercel (`standalone` is Docker-only).

## 2. Environment variables

Set these in Vercel → Project → Settings → Environment Variables for **Preview** and **Production** (and Development if using `vercel env pull`).

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon **pooled** URL (`-pooler` host). App runtime via `PrismaNeon`. |
| `DATABASE_URL_UNPOOLED` | Yes for migrations | Neon **direct** URL. Used by `prisma migrate deploy`. |
| `MAX_UPLOAD_BYTES` | Recommended | Default in code is **4194304** (4 MiB), under Vercel’s ~4.5 MB body limit. |

Never commit real values. Do not paste connection strings into the client bundle.

### Preview vs production databases

Use a **separate Neon branch** (or project) for Preview so preview deployments cannot mutate production data.

- Production → production Neon branch pooled + direct URLs  
- Preview → development/preview Neon branch pooled + direct URLs  

## 3. Database migrations

Migrations are **not** run automatically on every Vercel build (by design).

After first deploy (or when new migrations land):

```bash
# With production (or preview) env loaded locally / in CI:
npx prisma migrate deploy
```

Use `DATABASE_URL_UNPOOLED` as Prisma’s `directUrl`. Do not run destructive reset commands against shared databases.

## 4. Upload size

Vercel Functions have a standard **~4.5 MB** request-body limit.

This app defaults to **4 MB** (`MAX_UPLOAD_BYTES=4194304`) and enforces the limit on the server (including multipart overhead checks). The assignment sample CSVs (~480 KB for the large sample) fit comfortably.

Larger uploads later would need direct-to-object-storage + a background worker — not required for this assignment.

## 5. Function duration

`POST /api/imports` sets `maxDuration = 60` (seconds).

- **Vercel Pro**: 60s is supported; a full 5,000-row sync import may still approach limits depending on Neon latency.
- **Vercel Hobby**: shorter caps may cause timeouts on large files; use `students_small.csv` for demos or upgrade.

Imports use bounded concurrent upserts (not unbounded `Promise.all`). Work does not continue after the HTTP response ends. If production traffic needs reliable multi-minute imports, add a queue/worker architecture (documented as a future enhancement in `NOTES.md`).

## 6. Neon / Prisma verification checklist

- [ ] Prisma **6.19.x** + `@prisma/adapter-neon`
- [ ] Pooled `DATABASE_URL` for queries
- [ ] Direct `DATABASE_URL_UNPOOLED` for migrate
- [ ] Prisma Client singleton (`src/lib/prisma.ts`)
- [ ] Route handlers use `runtime = "nodejs"` where Prisma/CSV run
- [ ] No database credentials in client components

## 7. Post-deploy verification

1. `GET /api/health` → healthy  
2. Open `/` dashboard  
3. Upload `students_small.csv` on `/import`  
4. Confirm counts, open a student report  
5. Re-upload the same file → `SKIPPED_IDENTICAL`  
6. Attempt a file larger than `MAX_UPLOAD_BYTES` → clear 413 / client error  

## 8. Common errors

| Symptom | Likely cause |
|---|---|
| Prisma connection errors | Wrong pooled URL, missing SSL, or compute suspended |
| Migrate fails in CI | Missing `DATABASE_URL_UNPOOLED` |
| 413 on upload | File or multipart body over limit |
| 504 / function timeout on large CSV | Duration cap; use smaller file or Pro + background jobs |
| `IMPORT_IN_PROGRESS` 409 | Concurrent identical upload; wait and retry |

## 9. Docker (assignment requirement)

Docker is independent of Vercel:

```bash
docker compose up --build
```

Requires host `.env` with both Neon URLs. Image build sets `DOCKER_BUILD=1` for `output: "standalone"`.
