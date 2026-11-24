import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const {
  findFirst,
  findUnique,
  findUniqueOrThrow,
  create,
  update,
  updateMany,
  deleteMany,
  createMany,
  upsert,
  executeRaw,
  count,
  findMany,
} = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
  createMany: vi.fn(),
  upsert: vi.fn(),
  executeRaw: vi.fn(),
  count: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    importBatch: {
      findFirst,
      findUnique,
      findUniqueOrThrow,
      create,
      update,
      updateMany,
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
    $executeRaw: executeRaw,
  },
}));

import { processCsvImport } from "@/lib/import/import-service";
import { ImportClientError } from "@/lib/import/errors";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

describe("processCsvImport (unit)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue(null);
    upsert.mockResolvedValue({});
    createMany.mockResolvedValue({ count: 0 });
    executeRaw.mockResolvedValue(1);
    updateMany.mockResolvedValue({ count: 1 });
  });

  it("returns SKIPPED_IDENTICAL for an already completed identical file", async () => {
    findFirst.mockResolvedValue({
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

  it("rejects concurrent identical upload while PROCESSING (not SKIPPED_IDENTICAL)", async () => {
    findFirst.mockResolvedValue({
      id: "batch-busy",
      filename: "students.csv",
      status: "PROCESSING",
      totalRows: 10,
      importedRows: 3,
      rejectedRows: 0,
      skippedRows: 0,
      fileHash: "abc",
      importedAt: new Date(),
      completedAt: null,
      _count: { errors: 0 },
    });

    const csv = Buffer.from(
      `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );

    await expect(
      processCsvImport({
        filename: "students.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toMatchObject({
      code: "IMPORT_IN_PROGRESS",
      status: 409,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it("processes a new file as PROCESSING then COMPLETED", async () => {
    create.mockResolvedValue({
      id: "batch-2",
      filename: "students.csv",
      fileHash: "hash",
    });
    findUniqueOrThrow.mockResolvedValue({
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
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PROCESSING" }),
      }),
    );
    expect(executeRaw).toHaveBeenCalled();
  });

  it("counts rejected rows and stores errors", async () => {
    create.mockResolvedValue({ id: "batch-3" });
    findUniqueOrThrow.mockResolvedValue({
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

  it("handles create race with COMPLETED peer as SKIPPED_IDENTICAL", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "winner",
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

    expect(result.summary.status).toBe("SKIPPED_IDENTICAL");
    expect(result.summary.originalImportId).toBe("winner");
  });

  it("handles create race with PROCESSING peer as IMPORT_IN_PROGRESS", async () => {
    create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );
    findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "busy",
        filename: "students.csv",
        status: "PROCESSING",
        totalRows: 1,
        importedRows: 0,
        rejectedRows: 0,
        skippedRows: 0,
        fileHash: "hash",
        importedAt: new Date(),
        completedAt: null,
        _count: { errors: 0 },
      });

    const csv = Buffer.from(
      `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
      "utf8",
    );

    await expect(
      processCsvImport({
        filename: "students.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toBeInstanceOf(ImportClientError);
  });
});
