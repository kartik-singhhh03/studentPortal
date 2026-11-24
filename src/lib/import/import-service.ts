import { Prisma } from "@prisma/client";
import { parseStudentCsv } from "@/lib/import/csv-parser";
import { ImportClientError } from "@/lib/import/errors";
import { flattenRowErrors } from "@/lib/import/error-report";
import { sha256Hex } from "@/lib/import/file-hash";
import { validateParsedCsv } from "@/lib/import/validation";
import { prisma } from "@/lib/prisma";
import type { ImportSummary, ValidatedStudentRow } from "@/types/import";

const STUDENT_UPSERT_CHUNK = 100;
const ERROR_INSERT_CHUNK = 250;

function toSummary(
  batch: {
    id: string;
    filename: string;
    status: "COMPLETED" | "FAILED" | "SKIPPED_IDENTICAL";
    totalRows: number;
    importedRows: number;
    rejectedRows: number;
    skippedRows: number;
    fileHash: string;
    importedAt: Date;
    completedAt: Date | null;
    _count?: { errors: number };
  },
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
    identicalUpload: options?.identicalUpload ?? batch.status === "SKIPPED_IDENTICAL",
    originalImportId: options?.originalImportId ?? null,
    importedAt: batch.importedAt.toISOString(),
    completedAt: (batch.completedAt ?? batch.importedAt).toISOString(),
  };
}

async function upsertStudents(students: ValidatedStudentRow[]): Promise<void> {
  for (let i = 0; i < students.length; i += STUDENT_UPSERT_CHUNK) {
    const chunk = students.slice(i, i + STUDENT_UPSERT_CHUNK);
    await prisma.$transaction(
      chunk.map((student) =>
        prisma.student.upsert({
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
        }),
      ),
    );
  }
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

export async function processCsvImport(input: {
  filename: string;
  bytes: Buffer;
  importDate?: Date;
}): Promise<{ summary: ImportSummary; httpStatus: number }> {
  const fileHash = sha256Hex(input.bytes);
  const filename = input.filename.trim() || "upload.csv";
  const importDate = input.importDate ?? new Date();

  const existing = await prisma.importBatch.findUnique({
    where: { fileHash },
    include: { _count: { select: { errors: true } } },
  });

  if (existing && existing.status !== "FAILED") {
    return {
      httpStatus: 200,
      summary: {
        ...toSummary(existing, {
          identicalUpload: true,
          originalImportId: existing.id,
        }),
        status: "SKIPPED_IDENTICAL",
      },
    };
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

  let batchId = existing?.id;

  try {
    if (existing?.status === "FAILED") {
      await prisma.importError.deleteMany({ where: { importBatchId: existing.id } });
      await prisma.importBatch.update({
        where: { id: existing.id },
        data: {
          filename,
          totalRows: parsed.rowsRead,
          importedRows: 0,
          rejectedRows: 0,
          skippedRows: parsed.skippedRows,
          status: "FAILED",
          completedAt: null,
        },
      });
      batchId = existing.id;
    } else {
      const created = await prisma.importBatch.create({
        data: {
          filename,
          fileHash,
          totalRows: parsed.rowsRead,
          importedRows: 0,
          rejectedRows: 0,
          skippedRows: parsed.skippedRows,
          status: "FAILED",
        },
      });
      batchId = created.id;
    }
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const raced = await prisma.importBatch.findUnique({
        where: { fileHash },
        include: { _count: { select: { errors: true } } },
      });
      if (raced && raced.status !== "FAILED") {
        return {
          httpStatus: 200,
          summary: {
            ...toSummary(raced, {
              identicalUpload: true,
              originalImportId: raced.id,
            }),
            status: "SKIPPED_IDENTICAL",
          },
        };
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

  try {
    await upsertStudents(accepted);
    await insertErrors(batchId, flatErrors);

    const completedAt = new Date();
    const updated = await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        filename,
        totalRows: parsed.rowsRead,
        importedRows: accepted.length,
        rejectedRows,
        skippedRows: parsed.skippedRows,
        status: "COMPLETED",
        completedAt,
      },
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
    await prisma.importBatch.update({
      where: { id: batchId },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        importedRows: 0,
        rejectedRows,
        totalRows: parsed.rowsRead,
        skippedRows: parsed.skippedRows,
      },
    });
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
