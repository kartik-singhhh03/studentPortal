/**
 * Optional development seed script.
 * Phase 1: placeholder only — import pipeline lands in a later phase.
 *
 * Intended usage (later):
 *   npx tsx scripts/seed.ts
 */

async function main() {
  console.log(
    "Seed is not implemented in Phase 1. Use the CSV import API after Phase 2.",
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
