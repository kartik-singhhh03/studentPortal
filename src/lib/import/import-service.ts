import { Prisma } from "@prisma/client";
import { parseStudentCsv } from "@/lib/import/csv-parser";
import { ImportClientError } from "@/lib/import/errors";
import { flattenRowErrors } from "@/lib/import/error-report";
import { sha256Hex } from "@/lib/import/file-hash";
import { validateParsedCsv } from "@/lib/import/validation";
import { prisma } from "@/lib/prisma";
import type {
  ImportBatchStatus,
  ImportSummary,
  ValidatedStudentRow,
} from "@/types/import";

// Keep chunks modest: Neon + PrismaNeon handles many small autocommit writes
// more reliably than large interactive $transaction batches.
const STUDENT_UPSERT_CHUNK = 25;
const STUDENT_UPSERT_CONCURRENCY = 5;
const ERROR_INSERT_CHUNK = 250;
const PROGRESS_UPDATE_EVERY_CHUNKS = 4;

/** Stale PROCESSING rows are reclaimed as FAILED so retries are not blocked forever. */
export const STALE_PROCESSING_MS = 30 * 60 * 1000;

const ACTIVE_HASH_STATUSES = [
  "PROCESSING",
  "COMPLETED",
  "SKIPPED_IDENTICAL",
] as const satisfies readonly ImportBatchStatus[];

type BatchWithErrorCount = {
  id: string;
  filename: string;
  status: ImportBatchStatus;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  skippedRows: number;
  fileHash: string;
  importedAt: Date;
  completedAt: Date | null;
  _count?: { errors: number };
};

function toSummary(
  batch: BatchWithErrorCount,
  options?: { identicalUpload?: boolean; originalImportId?: string | null },
): ImportSummary {
  return {
    importId: batch.id,
    filename: batch.filename,
    status: batch.status,
    totalRows: batch.totalRows,
    acceptedRows: batch.importedRows,
    rejectedRows: batch.rejectedRows,
    skippedRows: batch.skippedRows,
    errorCount: batch._count?.errors ?? 0,
    fileHash: batch.fileHash,
    identicalUpload:
      options?.identicalUpload ?? batch.status === "SKIPPED_IDENTICAL",
    originalImportId: options?.originalImportId ?? null,
    importedAt: batch.importedAt.toISOString(),
    completedAt: (batch.completedAt ?? batch.importedAt).toISOString(),
  };
}

function studentUpsertArgs(student: ValidatedStudentRow) {
  return {
    where: { studentId: student.studentId },
    create: {
      studentId: student.studentId,
      fullName: student.fullName,
      email: student.email,
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      section: student.section,
      maths: student.maths,
      science: student.science,
      english: student.english,
      socialStudies: student.socialStudies,
      secondLanguage: student.secondLanguage,
    },
    update: {
      fullName: student.fullName,
      email: student.email,
      dateOfBirth: student.dateOfBirth,
      gradeLevel: student.gradeLevel,
      section: student.section,
      maths: student.maths,
      science: student.science,
      english: student.english,
      socialStudies: student.socialStudies,
      secondLanguage: student.secondLanguage,
    },
  } as const;
}

/**
 * Atomically increment importedRows for a PROCESSING batch.
 * Absolute overwrites would race under concurrent progress writers.
 */
export async function bumpImportedRows(
  batchId: string,
  delta: number,
): Promise<void> {
  if (delta <= 0) return;
  await prisma.$executeRaw`
    UPDATE "import_batches"
    SET "importedRows" = "importedRows" + ${delta}
    WHERE "id" = ${batchId}
      AND "status" = 'PROCESSING'::"ImportStatus"
  `;
}

/**
 * Persist accepted students without interactive transactions.
 * Progress is reported as successful-write deltas for atomic DB increments.
 */
async function upsertStudents(
  students: ValidatedStudentRow[],
  onSuccessDelta?: (delta: number, totalSucceeded: number) => Promise<void>,
): Promise<void> {
  let persisted = 0;
  let chunksCompleted = 0;
  let pendingDelta = 0;

  const flushProgress = async (force = false) => {
    if (!onSuccessDelta || pendingDelta <= 0) return;
    if (
      !force &&
      chunksCompleted > 0 &&
      chunksCompleted % PROGRESS_UPDATE_EVERY_CHUNKS !== 0 &&
      persisted !== students.length
    ) {
      return;
    }
    const delta = pendingDelta;
    pendingDelta = 0;
    await onSuccessDelta(delta, persisted);
  };

  for (let i = 0; i < students.length; i += STUDENT_UPSERT_CHUNK) {
    const chunk = students.slice(i, i + STUDENT_UPSERT_CHUNK);

    for (let j = 0; j < chunk.length; j += STUDENT_UPSERT_CONCURRENCY) {
      const slice = chunk.slice(j, j + STUDENT_UPSERT_CONCURRENCY);
      const results = await Promise.allSettled(
        slice.map((student) => prisma.student.upsert(studentUpsertArgs(student))),
      );
      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      persisted += succeeded;
      pendingDelta += succeeded;

      const rejected = results.find((r) => r.status === "rejected");
      if (rejected && rejected.status === "rejected") {
        await flushProgress(true);
        throw rejected.reason;
      }
    }

    chunksCompleted += 1;
    await flushProgress(persisted === students.length);
  }

  await flushProgress(true);
}

async function insertErrors(
  importBatchId: string,
  errors: Array<{
    rowNumber: number;
    studentId: string | null;
    field: string | null;
    errorCode: string;
    message: string;
    rejectedValue: string | null;
  }>,
): Promise<void> {
  for (let i = 0; i < errors.length; i += ERROR_INSERT_CHUNK) {
    const chunk = errors.slice(i, i + ERROR_INSERT_CHUNK);
    await prisma.importError.createMany({
      data: chunk.map((error) => ({
        importBatchId,
        rowNumber: error.rowNumber,
        studentId: error.studentId,
        field: error.field,
        errorCode: error.errorCode,
        message: error.message,
        rejectedValue: error.rejectedValue,
      })),
    });
  }
}

async function findActiveBatch(
  fileHash: string,
): Promise<BatchWithErrorCount | null> {
  return prisma.importBatch.findFirst({
    where: {
      fileHash,
      status: { in: [...ACTIVE_HASH_STATUSES] },
    },
    orderBy: { importedAt: "desc" },
    include: { _count: { select: { errors: true } } },
  });
}

function skippedIdenticalResponse(batch: BatchWithErrorCount) {
  return {
    httpStatus: 200 as const,
    summary: {
      ...toSummary(batch, {
        identicalUpload: true,
        originalImportId: batch.id,
      }),
      status: "SKIPPED_IDENTICAL" as const,
    },
  };
}

function importInProgressError(batch: BatchWithErrorCount): never {
  throw new ImportClientError(
    "IMPORT_IN_PROGRESS",
    "An identical file is already being imported. Retry after it finishes.",
    409,
    {
      importId: batch.id,
      status: batch.status,
      importedRows: batch.importedRows,
      totalRows: batch.totalRows,
    },
  );
}

/**
 * If a PROCESSING batch is stale (process died), mark it FAILED so a new
 * attempt can proceed without rewriting history of earlier FAILED rows.
 */
async function reclaimStaleProcessing(
  batch: BatchWithErrorCount,
  now = Date.now(),
): Promise<boolean> {
  if (batch.status !== "PROCESSING") return false;
  if (now - batch.importedAt.getTime() < STALE_PROCESSING_MS) return false;

  const result = await prisma.importBatch.updateMany({
    where: { id: batch.id, status: "PROCESSING" },
    data: {
      status: "FAILED",
      completedAt: new Date(now),
    },
  });
  return result.count === 1;
}

async function resolveIdenticalOrInProgress(
  fileHash: string,
): Promise<
  | { action: "proceed" }
  | { action: "skip"; batch: BatchWithErrorCount }
  | { action: "in_progress"; batch: BatchWithErrorCount }
> {
  const active = await findActiveBatch(fileHash);
  if (!active) return { action: "proceed" };

  if (active.status === "PROCESSING") {
    const reclaimed = await reclaimStaleProcessing(active);
    if (reclaimed) return { action: "proceed" };
    return { action: "in_progress", batch: active };
  }

  return { action: "skip", batch: active };
}

async function markBatchFailed(
  batchId: string,
  data: {
    importedRows: number;
    rejectedRows: number;
    totalRows: number;
    skippedRows: number;
  },
): Promise<void> {
  await prisma.importBatch.updateMany({
    where: { id: batchId, status: "PROCESSING" },
    data: {
      status: "FAILED",
      completedAt: new Date(),
      importedRows: data.importedRows,
      rejectedRows: data.rejectedRows,
      totalRows: data.totalRows,
      skippedRows: data.skippedRows,
    },
  });
}

export async function processCsvImport(input: {
  filename: string;
  bytes: Buffer;
  importDate?: Date;
}): Promise<{ summary: ImportSummary; httpStatus: number }> {
  const fileHash = sha256Hex(input.bytes);
  const filename = input.filename.trim() || "upload.csv";
  const importDate = input.importDate ?? new Date();

  const gate = await resolveIdenticalOrInProgress(fileHash);
  if (gate.action === "skip") {
    return skippedIdenticalResponse(gate.batch);
  }
  if (gate.action === "in_progress") {
    importInProgressError(gate.batch);
  }

  const parsed = parseStudentCsv(input.bytes);
  const validated = validateParsedCsv(parsed, importDate);

  const accepted = validated
    .filter((row) => row.accepted)
    .map((row) => row.accepted!);
  const rejectedRows = validated.filter((row) => row.errors.length > 0).length;
  const flatErrors = validated.flatMap((row) =>
    flattenRowErrors(row.rowNumber, row.studentId, row.errors),
  );

  // Always create a NEW PROCESSING batch. Historical FAILED rows for this hash
  // are left untouched (including the interrupted 5k import).
  let batchId: string | null = null;

  try {
    const created = await prisma.importBatch.create({
      data: {
        filename,
        fileHash,
        totalRows: parsed.rowsRead,
        importedRows: 0,
        rejectedRows,
        skippedRows: parsed.skippedRows,
        status: "PROCESSING",
        completedAt: null,
      },
    });
    batchId = created.id;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await findActiveBatch(fileHash);
      if (raced?.status === "COMPLETED" || raced?.status === "SKIPPED_IDENTICAL") {
        return skippedIdenticalResponse(raced);
      }
      if (raced?.status === "PROCESSING") {
        importInProgressError(raced);
      }
    }
    throw error;
  }

  if (!batchId) {
    throw new ImportClientError(
      "INTERNAL_ERROR",
      "Failed to create import batch.",
      500,
    );
  }

  let studentsPersistedCount = 0;

  try {
    await upsertStudents(accepted, async (delta, totalSucceeded) => {
      studentsPersistedCount = totalSucceeded;
      await bumpImportedRows(batchId!, delta);
    });
    studentsPersistedCount = accepted.length;
    await insertErrors(batchId, flatErrors);

    const completedAt = new Date();
    const finalized = await prisma.importBatch.updateMany({
      where: { id: batchId, status: "PROCESSING" },
      data: {
        filename,
        totalRows: parsed.rowsRead,
        importedRows: accepted.length,
        rejectedRows,
        skippedRows: parsed.skippedRows,
        status: "COMPLETED",
        completedAt,
      },
    });

    if (finalized.count !== 1) {
      throw new ImportClientError(
        "IMPORT_IN_PROGRESS",
        "Import batch was no longer processing when finalizing; not marked completed.",
        409,
        { importId: batchId },
      );
    }

    const updated = await prisma.importBatch.findUniqueOrThrow({
      where: { id: batchId },
      include: { _count: { select: { errors: true } } },
    });

    return {
      httpStatus: 201,
      summary: toSummary(updated, {
        identicalUpload: false,
        originalImportId: null,
      }),
    };
  } catch (error) {
    try {
      await markBatchFailed(batchId, {
        importedRows: studentsPersistedCount,
        rejectedRows,
        totalRows: parsed.rowsRead,
        skippedRows: parsed.skippedRows,
      });
    } catch (accountingError) {
      console.error(
        "[import] failed to persist failure accounting",
        accountingError instanceof Error
          ? accountingError.message
          : accountingError,
      );
    }
    throw error;
  }
}

export async function listImportBatches(input: {
  page: number;
  pageSize: number;
}) {
  const skip = (input.page - 1) * input.pageSize;
  const [total, batches] = await Promise.all([
    prisma.importBatch.count(),
    prisma.importBatch.findMany({
      orderBy: { importedAt: "desc" },
      skip,
      take: input.pageSize,
      include: { _count: { select: { errors: true } } },
    }),
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    items: batches.map((batch) =>
      toSummary(batch, {
        identicalUpload: batch.status === "SKIPPED_IDENTICAL",
        originalImportId:
          batch.status === "SKIPPED_IDENTICAL" ? batch.id : null,
      }),
    ),
  };
}

export async function getImportBatch(importId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: importId },
    include: { _count: { select: { errors: true } } },
  });

  if (!batch) {
    throw new ImportClientError("NOT_FOUND", "Import batch not found.", 404);
  }

  return toSummary(batch, {
    identicalUpload: batch.status === "SKIPPED_IDENTICAL",
    originalImportId: batch.status === "SKIPPED_IDENTICAL" ? batch.id : null,
  });
}

export async function listImportErrors(input: {
  importId: string;
  page: number;
  pageSize: number;
}) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: input.importId },
    select: { id: true },
  });
  if (!batch) {
    throw new ImportClientError("NOT_FOUND", "Import batch not found.", 404);
  }

  const skip = (input.page - 1) * input.pageSize;
  const [total, errors] = await Promise.all([
    prisma.importError.count({ where: { importBatchId: input.importId } }),
    prisma.importError.findMany({
      where: { importBatchId: input.importId },
      orderBy: [{ rowNumber: "asc" }, { id: "asc" }],
      skip,
      take: input.pageSize,
    }),
  ]);

  return {
    page: input.page,
    pageSize: input.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / input.pageSize)),
    items: errors.map((error) => ({
      id: error.id,
      rowNumber: error.rowNumber,
      studentId: error.studentId,
      field: error.field,
      errorCode: error.errorCode,
      message: error.message,
      rejectedValue: error.rejectedValue,
    })),
  };
}

export async function getAllImportErrorsForReport(importId: string) {
  const batch = await prisma.importBatch.findUnique({
    where: { id: importId },
    select: { id: true, filename: true },
  });
  if (!batch) {
    throw new ImportClientError("NOT_FOUND", "Import batch not found.", 404);
  }

  const errors = await prisma.importError.findMany({
    where: { importBatchId: importId },
    orderBy: [{ rowNumber: "asc" }, { id: "asc" }],
  });

  return { batch, errors };
}
