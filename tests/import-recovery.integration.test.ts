import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { ImportClientError } from "@/lib/import/errors";
import { sha256Hex } from "@/lib/import/file-hash";
import {
  bumpImportedRows,
  processCsvImport,
  STALE_PROCESSING_MS,
} from "@/lib/import/import-service";
import { prisma } from "@/lib/prisma";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

function csvFor(ids: string[], extraLines: string[] = []) {
  const rows = ids.map(
    (id, i) =>
      `${id},Retry User ${i},${id.toLowerCase()}@example.edu,2012-01-01,8,A,80,81,82,83,84`,
  );
  return Buffer.from([HEADER, ...rows, ...extraLines].join("\n"), "utf8");
}

describeDb("CSV import recovery (Neon)", () => {
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
    "retries a FAILED identical file with a new batch and preserves the FAILED history",
    async () => {
      const marker = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
      const studentId = `R${marker}`;
      const bytes = csvFor([studentId]);
      const fileHash = sha256Hex(bytes);

      const historical = await prisma.importBatch.create({
        data: {
          filename: "historical-failed.csv",
          fileHash,
          totalRows: 1,
          importedRows: 0,
          rejectedRows: 0,
          skippedRows: 0,
          status: "FAILED",
          completedAt: new Date("2026-11-24T08:00:00Z"),
        },
      });
      createdBatchIds.push(historical.id);

      // Simulate partial student write from the interrupted attempt.
      await prisma.student.upsert({
        where: { studentId },
        create: {
          studentId,
          fullName: "Partial Name",
          email: `${studentId.toLowerCase()}@example.edu`,
          dateOfBirth: new Date("2012-01-01"),
          gradeLevel: 7,
          section: "Z",
          maths: 10,
          science: 10,
          english: 10,
          socialStudies: 10,
          secondLanguage: 10,
        },
        update: {},
      });
      createdStudentIds.push(studentId);

      const retry = await processCsvImport({
        filename: "retry.csv",
        bytes,
        importDate: new Date("2026-11-24"),
      });
      createdBatchIds.push(retry.summary.importId);

      expect(retry.httpStatus).toBe(201);
      expect(retry.summary.status).toBe("COMPLETED");
      expect(retry.summary.importId).not.toBe(historical.id);
      expect(retry.summary.acceptedRows).toBe(1);

      const preserved = await prisma.importBatch.findUnique({
        where: { id: historical.id },
      });
      expect(preserved?.status).toBe("FAILED");
      expect(preserved?.completedAt?.toISOString()).toBe(
        "2026-11-24T08:00:00.000Z",
      );

      const student = await prisma.student.findUnique({
        where: { studentId },
      });
      expect(student?.fullName).toBe("Retry User 0");
      expect(student?.gradeLevel).toBe(8);
      expect(student?.section).toBe("A");

      const sameHash = await prisma.importBatch.count({ where: { fileHash } });
      expect(sameHash).toBe(2);

      const identical = await processCsvImport({
        filename: "retry.csv",
        bytes,
        importDate: new Date("2026-11-24"),
      });
      expect(identical.summary.status).toBe("SKIPPED_IDENTICAL");
      expect(identical.summary.originalImportId).toBe(retry.summary.importId);
    },
    60_000,
  );

  it(
    "atomically increments importedRows under concurrent bump workers",
    async () => {
      const marker = randomUUID().replace(/-/g, "").slice(0, 8);
      const batch = await prisma.importBatch.create({
        data: {
          filename: `progress-${marker}.csv`,
          fileHash: `progress-hash-${marker}`,
          totalRows: 100,
          importedRows: 0,
          rejectedRows: 0,
          skippedRows: 0,
          status: "PROCESSING",
        },
      });
      createdBatchIds.push(batch.id);

      await Promise.all(
        Array.from({ length: 20 }, () => bumpImportedRows(batch.id, 1)),
      );

      const updated = await prisma.importBatch.findUnique({
        where: { id: batch.id },
      });
      expect(updated?.importedRows).toBe(20);

      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { status: "FAILED", completedAt: new Date() },
      });
    },
    60_000,
  );

  it(
    "allows only one concurrent identical upload to complete",
    async () => {
      const marker = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
      const studentId = `C${marker}`;
      const bytes = csvFor([studentId]);
      createdStudentIds.push(studentId);

      const [a, b] = await Promise.allSettled([
        processCsvImport({
          filename: "concurrent-a.csv",
          bytes,
          importDate: new Date("2026-11-24"),
        }),
        processCsvImport({
          filename: "concurrent-b.csv",
          bytes,
          importDate: new Date("2026-11-24"),
        }),
      ]);

      const outcomes = [a, b].map((result) => {
        if (result.status === "fulfilled") {
          createdBatchIds.push(result.value.summary.importId);
          return {
            ok: true as const,
            httpStatus: result.value.httpStatus,
            status: result.value.summary.status,
            importId: result.value.summary.importId,
          };
        }
        const err = result.reason;
        if (err instanceof ImportClientError) {
          return {
            ok: false as const,
            code: err.code,
            status: err.status,
          };
        }
        throw result.reason;
      });

      const completed = outcomes.filter(
        (o) => o.ok && o.status === "COMPLETED",
      );
      const skipped = outcomes.filter(
        (o) => o.ok && o.status === "SKIPPED_IDENTICAL",
      );
      const inProgress = outcomes.filter(
        (o) => !o.ok && o.code === "IMPORT_IN_PROGRESS",
      );

      expect(completed.length).toBe(1);
      expect(completed.length + skipped.length + inProgress.length).toBe(2);

      const fileHash = sha256Hex(bytes);
      const completedBatches = await prisma.importBatch.count({
        where: { fileHash, status: "COMPLETED" },
      });
      expect(completedBatches).toBe(1);

      const students = await prisma.student.count({
        where: { studentId },
      });
      expect(students).toBe(1);

      // No SKIPPED_IDENTICAL while a PROCESSING active row remains.
      const processing = await prisma.importBatch.count({
        where: { fileHash, status: "PROCESSING" },
      });
      expect(processing).toBe(0);
      if (skipped.length > 0) {
        expect(completedBatches).toBe(1);
      }
    },
    60_000,
  );

  it(
    "reclaims a stale PROCESSING batch so retry can proceed",
    async () => {
      const marker = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
      const studentId = `S${marker}`;
      const bytes = csvFor([studentId]);
      const fileHash = sha256Hex(bytes);
      createdStudentIds.push(studentId);

      const stale = await prisma.importBatch.create({
        data: {
          filename: "stale.csv",
          fileHash,
          totalRows: 1,
          importedRows: 0,
          rejectedRows: 0,
          skippedRows: 0,
          status: "PROCESSING",
          importedAt: new Date(Date.now() - STALE_PROCESSING_MS - 60_000),
        },
      });
      createdBatchIds.push(stale.id);

      const result = await processCsvImport({
        filename: "after-stale.csv",
        bytes,
        importDate: new Date("2026-11-24"),
      });
      createdBatchIds.push(result.summary.importId);

      expect(result.summary.status).toBe("COMPLETED");
      expect(result.summary.importId).not.toBe(stale.id);

      const staleAfter = await prisma.importBatch.findUnique({
        where: { id: stale.id },
      });
      expect(staleAfter?.status).toBe("FAILED");
      expect(staleAfter?.completedAt).not.toBeNull();
    },
    60_000,
  );
});
