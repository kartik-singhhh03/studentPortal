import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUnique,
  create,
  update,
  deleteMany,
  createMany,
  upsert,
  transaction,
  count,
  findMany,
} = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteMany: vi.fn(),
  createMany: vi.fn(),
  upsert: vi.fn(),
  transaction: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    importBatch: {
      findUnique,
      create,
      update,
      count,
      findMany,
    },
    importError: {
      deleteMany,
      createMany,
      count,
      findMany,
    },
    student: {
      upsert,
    },
    $transaction: transaction,
  },
}));

import { processCsvImport } from "@/lib/import/import-service";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

describe("processCsvImport (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
      Promise.all(ops),
    );
    upsert.mockResolvedValue({});
    createMany.mockResolvedValue({ count: 0 });
  });

  it("returns SKIPPED_IDENTICAL for an already completed identical file", async () => {
    findUnique.mockResolvedValue({
      id: "batch-1",
      filename: "students.csv",
      status: "COMPLETED",
      totalRows: 1,
      importedRows: 1,
      rejectedRows: 0,
      skippedRows: 0,
      fileHash: "abc",
      importedAt: new Date("2026-01-01"),
      completedAt: new Date("2026-01-01"),
      _count: { errors: 0 },
    });

    const csv = Buffer.from(
      `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );

    const result = await processCsvImport({
      filename: "students.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });

    expect(result.httpStatus).toBe(200);
    expect(result.summary.status).toBe("SKIPPED_IDENTICAL");
    expect(result.summary.identicalUpload).toBe(true);
    expect(result.summary.originalImportId).toBe("batch-1");
    expect(create).not.toHaveBeenCalled();
  });

  it("processes a new file and persists accepted students", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({
      id: "batch-2",
      filename: "students.csv",
      fileHash: "hash",
    });
    update.mockResolvedValue({
      id: "batch-2",
      filename: "students.csv",
      status: "COMPLETED",
      totalRows: 1,
      importedRows: 1,
      rejectedRows: 0,
      skippedRows: 0,
      fileHash: "hash",
      importedAt: new Date("2026-11-24"),
      completedAt: new Date("2026-11-24"),
      _count: { errors: 0 },
    });

    const csv = Buffer.from(
      `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );

    const result = await processCsvImport({
      filename: "students.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });

    expect(result.httpStatus).toBe(201);
    expect(result.summary.status).toBe("COMPLETED");
    expect(result.summary.acceptedRows).toBe(1);
    expect(upsert).toHaveBeenCalled();
  });

  it("counts rejected rows and stores errors", async () => {
    findUnique.mockResolvedValue(null);
    create.mockResolvedValue({ id: "batch-3" });
    update.mockResolvedValue({
      id: "batch-3",
      filename: "students.csv",
      status: "COMPLETED",
      totalRows: 1,
      importedRows: 0,
      rejectedRows: 1,
      skippedRows: 0,
      fileHash: "hash",
      importedAt: new Date("2026-11-24"),
      completedAt: new Date("2026-11-24"),
      _count: { errors: 1 },
    });

    const csv = Buffer.from(
      `${HEADER}\nSTU1,Ada,sana@example,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );

    const result = await processCsvImport({
      filename: "students.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });

    expect(result.summary.rejectedRows).toBe(1);
    expect(createMany).toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });
});
