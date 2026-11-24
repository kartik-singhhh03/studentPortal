import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findFirst,
  findUniqueOrThrow,
  create,
  updateMany,
  createMany,
  upsert,
  executeRaw,
} = vi.hoisted(() => ({
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  updateMany: vi.fn(),
  createMany: vi.fn(),
  upsert: vi.fn(),
  executeRaw: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    importBatch: {
      findFirst,
      findUniqueOrThrow,
      create,
      updateMany,
    },
    importError: { createMany, deleteMany: vi.fn() },
    student: { upsert },
    $executeRaw: executeRaw,
  },
}));

import {
  bumpImportedRows,
  processCsvImport,
} from "@/lib/import/import-service";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

function validRow(id: string) {
  return `${id},Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84`;
}

describe("failed import accounting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue(null);
    create.mockResolvedValue({ id: "batch-fail" });
    updateMany.mockResolvedValue({ count: 1 });
    executeRaw.mockResolvedValue(1);
    upsert.mockResolvedValue({});
  });

  it("creates a PROCESSING batch with rejectedRows before student upserts", async () => {
    createMany.mockResolvedValue({ count: 1 });
    findUniqueOrThrow.mockResolvedValue({
      id: "batch-fail",
      filename: "mixed.csv",
      status: "COMPLETED",
      totalRows: 2,
      importedRows: 1,
      rejectedRows: 1,
      skippedRows: 0,
      fileHash: "hash",
      importedAt: new Date("2026-11-24"),
      completedAt: new Date("2026-11-24"),
      _count: { errors: 1 },
    });

    const csv = Buffer.from(
      [
        HEADER,
        validRow("STU1"),
        "STU2,Bad Student,not-an-email,2012-01-01,8,A,80,81,82,83,84",
      ].join("\n"),
      "utf8",
    );

    await processCsvImport({
      filename: "mixed.csv",
      bytes: csv,
      importDate: new Date("2026-11-24"),
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totalRows: 2,
          importedRows: 0,
          rejectedRows: 1,
          status: "PROCESSING",
        }),
      }),
    );
  });

  it("records importedRows when students persisted before error-insert failure", async () => {
    createMany.mockRejectedValue(new Error("error insert failed"));

    const csv = Buffer.from(
      [
        HEADER,
        validRow("STU1"),
        "STU2,Bad Student,not-an-email,2012-01-01,8,A,80,81,82,83,84",
      ].join("\n"),
      "utf8",
    );

    await expect(
      processCsvImport({
        filename: "one.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toThrow("error insert failed");

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "batch-fail", status: "PROCESSING" },
        data: expect.objectContaining({
          status: "FAILED",
          importedRows: 1,
          rejectedRows: 1,
          completedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("keeps rejectedRows and partial importedRows when upserts fail mid-batch", async () => {
    let upsertCalls = 0;
    upsert.mockImplementation(async () => {
      upsertCalls += 1;
      if (upsertCalls > 3) {
        throw new Error("neon connection interrupted");
      }
      return {};
    });

    const rows = Array.from({ length: 12 }, (_, i) =>
      validRow(`STU${String(i + 1).padStart(3, "0")}`),
    );
    const csv = Buffer.from(
      [
        HEADER,
        ...rows,
        "BAD,,not-an-email,2012-01-01,8,A,80,81,82,83,84",
      ].join("\n"),
      "utf8",
    );

    await expect(
      processCsvImport({
        filename: "large-fail.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toThrow("neon connection interrupted");

    const failureUpdate = updateMany.mock.calls
      .map((call) => call[0])
      .find((arg) => arg?.data?.status === "FAILED");

    expect(failureUpdate).toBeTruthy();
    expect(failureUpdate.data.importedRows).toBeGreaterThan(0);
    expect(failureUpdate.data.importedRows).toBeLessThan(12);
    expect(failureUpdate.data.rejectedRows).toBe(1);
    expect(executeRaw).toHaveBeenCalled();
  });

  it("does not hide the original upsert error when failure accounting also fails", async () => {
    upsert.mockRejectedValue(new Error("original upsert boom"));
    updateMany.mockRejectedValue(new Error("accounting write failed"));

    const csv = Buffer.from(`${HEADER}\n${validRow("STU1")}\n`, "utf8");

    await expect(
      processCsvImport({
        filename: "boom.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toThrow("original upsert boom");
  });

  it("fails closed when final COMPLETED update matches no PROCESSING row", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    const csv = Buffer.from(`${HEADER}\n${validRow("STU1")}\n`, "utf8");

    await expect(
      processCsvImport({
        filename: "finalize.csv",
        bytes: csv,
        importDate: new Date("2026-11-24"),
      }),
    ).rejects.toMatchObject({
      code: "IMPORT_IN_PROGRESS",
      status: 409,
    });

    // Failure accounting should still try to mark FAILED after finalize miss.
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" }),
      }),
    );
  });

  it("bumpImportedRows issues an atomic SQL increment", async () => {
    await bumpImportedRows("batch-x", 5);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    const call = executeRaw.mock.calls[0]?.[0];
    expect(String(call?.strings?.join("") ?? call)).toContain("importedRows");
  });
});
