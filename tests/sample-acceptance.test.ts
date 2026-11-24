import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "@/lib/import/csv-parser";
import { validateParsedCsv } from "@/lib/import/validation";

const smallPath = path.join(process.cwd(), "sample-data", "students_small.csv");
const samplePath = path.join(process.cwd(), "sample-data", "students_sample.csv");
const importDate = new Date("2026-11-24T12:00:00");

const describeSamples = existsSync(smallPath) ? describe : describe.skip;

describeSamples("sample-data acceptance targets (validation only)", () => {
  it("matches students_small.csv expected counts", () => {
    const parsed = parseStudentCsv(readFileSync(smallPath));
    const rows = validateParsedCsv(parsed, importDate);
    expect(parsed.rowsRead).toBe(25);
    expect(rows.filter((r) => r.accepted).length).toBe(16);
    expect(rows.filter((r) => r.errors.length > 0).length).toBe(9);
  });

  it(
    "matches students_sample.csv expected counts",
    () => {
      const parsed = parseStudentCsv(readFileSync(samplePath));
      const rows = validateParsedCsv(parsed, importDate);
      expect(parsed.rowsRead).toBe(5000);
      expect(rows.filter((r) => r.accepted).length).toBe(4685);
      expect(rows.filter((r) => r.errors.length > 0).length).toBe(315);
    },
    60_000,
  );
});
