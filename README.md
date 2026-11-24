# Es Magico — Student Results Portal

Full-stack Next.js application for the Es Magico Fullstack Internship assignment: CSV student import, validation, grading, and administrator reporting on Neon PostgreSQL.

## Features

- CSV import with row validation, error reports, and SHA-256 idempotency
- Failed-import retry without losing historical batches
- Searchable, filterable, paginated student directory
- Student reports (marks, total, percentage, grade, pass/fail)
- Dashboard with live database statistics
- Docker and Vercel-ready deployment paths

## Stack

Next.js 15 App Router · React 19 · TypeScript · Tailwind CSS 4 · Prisma 6.19 · Neon PostgreSQL · Zod · csv-parse · Vitest

## Architecture

- **App Router** pages + Route Handlers (no Express)
- **PrismaNeon** adapter on pooled `DATABASE_URL`; migrations via `DATABASE_URL_UNPOOLED`
- Domain logic in `src/lib` (import, grading, students); UI in `src/components` / `src/app`

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_CONTRACT.md](docs/DATA_CONTRACT.md), and [NOTES.md](NOTES.md).

## Prerequisites

- Node.js 20+
- A Neon project (pooled + direct connection strings)
- Optional: Docker Desktop for container runs
- Optional: assignment `sample-data/` pack (gitignored)

## Setup

```bash
cp .env.example .env
# Fill DATABASE_URL (pooled) and DATABASE_URL_UNPOOLED (direct)
npm install
npx prisma migrate deploy
npm run dev
```

Open http://localhost:3000.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Neon URL (app runtime) |
| `DATABASE_URL_UNPOOLED` | Direct Neon URL (Prisma Migrate) |
| `MAX_UPLOAD_BYTES` | Max CSV size (default **4 MiB**, Vercel-safe) |

Never commit `.env` or `sample-data/`.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build & serve |
| `npm run lint` | ESLint |
| `npm test` | Vitest (unit + Neon integration when `DATABASE_URL` is set) |
| `npm run seed` | Load sample CSV or generate messy seed data |
| `npm run seed -- --generate` | Force-generated messy CSV import |
| `npx prisma migrate deploy` | Apply migrations |

## Seed

```bash
npm run seed
```

Uses `sample-data/students_small.csv` when present; otherwise generates a messy CSV with valid and invalid rows (unique `SEED…` IDs) and imports it. Does not reset the database.

## Docker

```bash
docker compose up --build
```

Requires both Neon URLs in the host `.env`. Health: `GET /api/health`.

## Vercel

See **[docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md)** for env vars, migrations, upload limits, and duration notes.

## Screens

| Path | Purpose |
|---|---|
| `/` | Dashboard |
| `/students` | Student list |
| `/students/[studentId]` | Student report |
| `/import` | CSV upload |
| `/imports` | Import history |
| `/imports/[importId]` | Import detail + errors |
