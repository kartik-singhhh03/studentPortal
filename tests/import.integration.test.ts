import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/import/file-hash";
import { processCsvImport } from "@/lib/import/import-service";
import { prisma } from "@/lib/prisma";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const smallPath = path.join(process.cwd(), "sample-data", "students_small.csv");

describeDb("CSV import integration (Neon)", () => {
  const createdBatchIds: string[] = [];
  const createdStudentIds: string[] = [];

  afterAll(async () => {
    if (createdBatchIds.length > 0) {
      await prisma.importError.deleteMany({
        where: { importBatchId: { in: createdBatchIds } },
      });
      await prisma.importBatch.deleteMany({
        where: { id: { in: createdBatchIds } },
      });
    }
    if (createdStudentIds.length > 0) {
      await prisma.student.deleteMany({
        where: { studentId: { in: createdStudentIds } },
      });
    }
    await prisma.$disconnect();
  });

  it(
    "imports students_small.csv with expected counts",
    async () => {
    const bytes = readFileSync(smallPath);
    const fileHash = sha256Hex(bytes);
    // Clear any prior identical sample import so counts are measurable.
    await prisma.importError.deleteMany({
      where: { importBatch: { fileHash } },
    });
    await prisma.importBatch.deleteMany({ where: { fileHash } });

    const result = await processCsvImport({
      filename: "students_small.csv",
      bytes,
      importDate: new Date("2026-11-24T12:00:00"),
    });

    createdBatchIds.push(result.summary.importId);

    const accepted = await prisma.student.findMany({
      where: {
        studentId: {
          in: [
            "STU00001",
            "STU00002",
            "STU00006",
            "STU00009",
            "STU00010",
            "STU00011",
            "STU00014",
            "STU00015",
            "STU00017",
            "STU00018",
            "STU00019",
            "STU00020",
            "STU00021",
            "STU00022",
            "STU00023",
            "STU00024",
          ],
        },
      },
      select: { studentId: true },
    });
    createdStudentIds.push(...accepted.map((s) => s.studentId));

    expect(result.httpStatus).toBe(201);
    expect(result.summary.totalRows).toBe(25);
    expect(result.summary.acceptedRows).toBe(16);
    expect(result.summary.rejectedRows).toBe(9);
    expect(result.summary.errorCount).toBeGreaterThanOrEqual(9);
    },
    60_000,
  );

  it(
    "skips an identical re-upload",
    async () => {
    const marker = randomUUID();
    const csv = Buffer.from(
      [
        "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language",
        `T${marker.slice(0, 8)},Test User,test.${marker}@example.edu,2012-01-01,8,A,80,81,82,83,84`,
        "",
      ].join("\n"),
      "utf8",
    );

    const first = await processCsvImport({
      filename: "idempotent.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });
    createdBatchIds.push(first.summary.importId);
    createdStudentIds.push(`T${marker.slice(0, 8)}`.toUpperCase());

    const second = await processCsvImport({
      filename: "idempotent.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });

    expect(second.summary.status).toBe("SKIPPED_IDENTICAL");
    expect(second.summary.originalImportId).toBe(first.summary.importId);
    expect(createHash("sha256").update(csv).digest("hex")).toBe(
      first.summary.fileHash,
    );

    const completedCount = await prisma.importBatch.count({
      where: {
        fileHash: first.summary.fileHash,
        status: "COMPLETED",
      },
    });
    expect(completedCount).toBe(1);
    },
    60_000,
  );

  it(
    "upserts an existing student on a later import",
    async () => {
    const id = `U${randomUUID().replace(/-/g, "").slice(0, 10)}`.toUpperCase();
    const header =
      "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

    const firstCsv = Buffer.from(
      `${header}\n${id},First Name,first.${id.toLowerCase()}@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );
    const secondCsv = Buffer.from(
      `${header}\n${id},Second Name,second.${id.toLowerCase()}@example.edu,2012-01-01,9,B,90,91,92,93,94\n`,
      "utf8",
    );

    const first = await processCsvImport({
      filename: "upsert-a.csv",
      bytes: firstCsv,
      importDate: new Date("2026-11-24"),
    });
    const second = await processCsvImport({
      filename: "upsert-b.csv",
      bytes: secondCsv,
      importDate: new Date("2026-11-24"),
    });

    createdBatchIds.push(first.summary.importId, second.summary.importId);
    createdStudentIds.push(id);

    const student = await prisma.student.findUnique({ where: { studentId: id } });
    expect(student?.fullName).toBe("Second Name");
    expect(student?.gradeLevel).toBe(9);
    expect(student?.section).toBe("B");

    const count = await prisma.student.count({ where: { studentId: id } });
    expect(count).toBe(1);
    },
    60_000,
  );

  it(
    "persists a medium CSV without interactive transactions (large-file behavior)",
    async () => {
      const marker = randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
      const header =
        "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";
      const rows: string[] = [];
      const studentIds: string[] = [];
      for (let i = 0; i < 120; i += 1) {
        const id = `L${marker}${String(i).padStart(3, "0")}`;
        studentIds.push(id);
        rows.push(
          `${id},Load Test ${i},load.${marker}.${i}@example.edu,2012-01-01,8,A,80,81,82,83,84`,
        );
      }
      // Two invalid rows + one blank to exercise counters alongside volume.
      rows.push(
        `L${marker}BAD,Bad,not-an-email,2012-01-01,8,A,80,81,82,83,84`,
      );
      rows.push("");
      rows.push(
        `L${marker}BAD2,,missing@example.edu,2012-01-01,8,A,80,81,82,83,84`,
      );

      const csv = Buffer.from([header, ...rows].join("\n"), "utf8");
      const result = await processCsvImport({
        filename: `load-${marker}.csv`,
        bytes: csv,
        importDate: new Date("2026-11-24"),
      });

      createdBatchIds.push(result.summary.importId);
      createdStudentIds.push(...studentIds);

      expect(result.httpStatus).toBe(201);
      expect(result.summary.status).toBe("COMPLETED");
      expect(result.summary.totalRows).toBe(122);
      expect(result.summary.acceptedRows).toBe(120);
      expect(result.summary.rejectedRows).toBe(2);
      expect(result.summary.skippedRows).toBe(1);

      const persisted = await prisma.student.count({
        where: { studentId: { in: studentIds } },
      });
      expect(persisted).toBe(120);

      const batch = await prisma.importBatch.findUnique({
        where: { id: result.summary.importId },
      });
      expect(batch?.importedRows).toBe(120);
      expect(batch?.rejectedRows).toBe(2);
      expect(batch?.completedAt).not.toBeNull();
    },
    180_000,
  );
});
