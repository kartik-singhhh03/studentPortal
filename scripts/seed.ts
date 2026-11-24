/**
 * Development seed helper.
 *
 * Prefer importing via the UI or POST /api/imports with sample-data CSVs.
 * This script documents the intended path without inventing student rows.
 *
 *   npx tsx scripts/seed.ts
 */

async function main() {
  console.log(
    [
      "Seed placeholder.",
      "Place assignment CSVs in sample-data/ (gitignored), then:",
      "  1) npm run dev",
      "  2) open /import and upload students_small.csv or students_sample.csv",
      "Or POST multipart file=... to /api/imports.",
    ].join("\n"),
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
