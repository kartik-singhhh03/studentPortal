/**
 * Seed the database with realistic messy student CSV data.
 *
 * Usage:
 *   npm run seed
 *   npm run seed -- sample-data/students_small.csv
 *   npm run seed -- --generate
 *
 * Prefer an assignment sample file when present. With --generate (or when the
 * sample pack is missing), builds a messy CSV with valid + invalid rows using
 * unique SEED-prefixed IDs so production sample data is not required.
 *
 * Requires DATABASE_URL. Does not reset the database.
 */

import "dotenv/config";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { processCsvImport } from "../src/lib/import/import-service";
import { prisma } from "../src/lib/prisma";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

function generateMessyCsv(): Buffer {
  const tag = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  const lines: string[] = [HEADER];

  for (let i = 0; i < 40; i += 1) {
    const id = `SEED${tag}${String(i).padStart(3, "0")}`;
    lines.push(
      `${id},Seed Student ${i},${id.toLowerCase()}@example.edu,2012-0${(i % 9) + 1}-15,${(i % 12) + 1},${String.fromCharCode(65 + (i % 6))},${60 + (i % 40)},${55 + (i % 40)},${50 + (i % 40)},${45 + (i % 40)},${40 + (i % 40)}`,
    );
  }

  // Invalid cases: bad email, missing name, out-of-range mark, duplicate ID (2nd loses)
  const dupId = `SEED${tag}000`;
  lines.push(
    `${dupId},Duplicate Later,dup.${tag}@example.edu,2012-01-01,8,A,80,81,82,83,84`,
  );
  lines.push(
    `SEED${tag}BAD1,Bad Email,not-an-email,2012-01-01,8,A,80,81,82,83,84`,
  );
  lines.push(
    `SEED${tag}BAD2,,missing.name@example.edu,2012-01-01,8,A,80,81,82,83,84`,
  );
  lines.push(
    `SEED${tag}BAD3,Out Of Range,oor.${tag}@example.edu,2012-01-01,8,A,120,81,82,83,84`,
  );
  lines.push(""); // blank skip
  lines.push(
    `SEED${tag}BAD4,Future DOB,future.${tag}@example.edu,2099-01-01,8,A,80,81,82,83,84`,
  );

  return Buffer.from(lines.join("\n"), "utf8");
}

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--");
  const forceGenerate = args.includes("--generate");
  const pathArg = args.find((a) => !a.startsWith("--"));

  let bytes: Buffer;
  let filename: string;

  const defaultSample = path.join("sample-data", "students_small.csv");
  const samplePath = path.resolve(process.cwd(), pathArg ?? defaultSample);

  if (!forceGenerate && existsSync(samplePath)) {
    bytes = readFileSync(samplePath);
    filename = path.basename(samplePath);
    console.log(`Using sample file: ${samplePath}`);
  } else {
    bytes = generateMessyCsv();
    filename = `seed-generated-${createHash("sha256").update(bytes).digest("hex").slice(0, 8)}.csv`;
    const outDir = path.join(process.cwd(), "sample-data");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, filename);
    writeFileSync(outPath, bytes);
    console.log(
      forceGenerate || !existsSync(samplePath)
        ? `Generated messy CSV: ${outPath}`
        : `Generated messy CSV: ${outPath}`,
    );
  }

  const result = await processCsvImport({
    filename,
    bytes,
  });

  console.log(
    JSON.stringify(
      {
        status: result.summary.status,
        importId: result.summary.importId,
        totalRows: result.summary.totalRows,
        acceptedRows: result.summary.acceptedRows,
        rejectedRows: result.summary.rejectedRows,
        skippedRows: result.summary.skippedRows,
        identicalUpload: result.summary.identicalUpload,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
