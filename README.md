# Es Magico — Student Results Portal

Full-stack Next.js application for the Es Magico Fullstack Internship assignment.

## Phase 1 status

Architecture, data contract, Prisma schema, core libraries, and deployment scaffolding are in place. CSV import UI and student screens are intentionally deferred.

See:

- [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)

## Stack

Next.js App Router · TypeScript · Tailwind CSS · Prisma 6 · Neon PostgreSQL · Zod · csv-parse · Vitest · Docker

## Environment setup

1. Copy the example env file (safe placeholders only):

   ```bash
   cp .env.example .env
   ```

2. Fill in Neon connection strings from the Neon Console → **Connect**:
   - `DATABASE_URL` — **pooled** (`-pooler` host) for the app
   - `DATABASE_URL_UNPOOLED` — **direct** host for Prisma migrations
3. Do **not** commit `.env` or `.env.local`.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon URL used by Prisma Client (`PrismaNeon`) |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL used by Prisma Migrate / CLI |
| `MAX_UPLOAD_BYTES` | Max CSV upload size in bytes |

`.env.example` is tracked in Git. `.env` and `.env.*` (except `.env.example`) are ignored.

## Local database setup

This project uses **Neon PostgreSQL** via Prisma + `@prisma/adapter-neon`.

```bash
npm install
npx prisma migrate deploy
npm run dev
```

- Runtime queries use the pooled `DATABASE_URL`.
- Migrations use `DATABASE_URL_UNPOOLED` (`directUrl` in `prisma/schema.prisma`).
- Inspect data with `npx prisma studio` if needed.

## Sample data (not in Git)

`sample-data/` is **excluded from Git** and must be obtained separately (assignment pack).

Do **not** commit:

- `students_sample.csv`
- `students_small.csv`
- `sample-data/README.md`
- any other files under `sample-data/`

Place the pack at the repo root as `sample-data/` for local testing only. Never put assignment CSVs under `public/`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm test` | Vitest |
| `npm run db:migrate` | Create/apply migrations |

## Docker

Provide Neon env vars from the host (never bake secrets into the image):

```bash
docker compose up --build
```

## Security notes before pushing to GitHub

- Confirm `.env` is not staged.
- Confirm `sample-data/` is not staged.
- Rotate any credential that was ever pasted into a local `.env` if you are unsure whether it was shared.
