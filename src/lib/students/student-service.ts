import { Prisma } from "@prisma/client";
import { z } from "zod";
import { gradeStudent } from "@/lib/grading";
import { ageOnDate } from "@/lib/validation/student-fields";
import { ImportClientError } from "@/lib/import/errors";
import { prisma } from "@/lib/prisma";
import type {
  DashboardStats,
  StudentDetail,
  StudentListItem,
  StudentsListResponse,
} from "@/types/student";

const listQuerySchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  gradeLevel: z.coerce.number().int().min(1).max(12).optional(),
  section: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-F]$/)
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .enum(["fullName", "studentId", "gradeLevel", "section", "updatedAt"])
    .default("fullName"),
  order: z.enum(["asc", "desc"]).default("asc"),
});

export type StudentListQuery = z.infer<typeof listQuerySchema>;

export function parseStudentListQuery(
  searchParams: URLSearchParams,
): StudentListQuery {
  const rawSection = searchParams.get("section");
  const parsed = listQuerySchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    gradeLevel: searchParams.get("gradeLevel") || undefined,
    section: rawSection || undefined,
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    sort: searchParams.get("sort") ?? undefined,
    order: searchParams.get("order") ?? undefined,
  });

  if (!parsed.success) {
    throw new ImportClientError(
      "INVALID_QUERY",
      "Invalid student list query parameters.",
      400,
    );
  }

  return parsed.data;
}

function toListItem(student: {
  studentId: string;
  fullName: string;
  email: string;
  gradeLevel: number;
  section: string;
  maths: number;
  science: number;
  english: number;
  socialStudies: number;
  secondLanguage: number;
}): StudentListItem {
  const grading = gradeStudent({
    maths: student.maths,
    science: student.science,
    english: student.english,
    socialStudies: student.socialStudies,
    secondLanguage: student.secondLanguage,
  });

  return {
    studentId: student.studentId,
    fullName: student.fullName,
    email: student.email,
    gradeLevel: student.gradeLevel,
    section: student.section,
    percentage: Number(grading.percentage.toFixed(2)),
    letterGrade: grading.letterGrade,
    passed: grading.passed,
  };
}

export async function listStudents(
  query: StudentListQuery,
): Promise<StudentsListResponse> {
  const where: Prisma.StudentWhereInput = {};

  if (query.q) {
    where.OR = [
      { fullName: { contains: query.q, mode: "insensitive" } },
      { studentId: { contains: query.q.toUpperCase(), mode: "insensitive" } },
    ];
  }
  if (query.gradeLevel !== undefined) {
    where.gradeLevel = query.gradeLevel;
  }
  if (query.section) {
    where.section = query.section;
  }

  const skip = (query.page - 1) * query.pageSize;
  const orderBy: Prisma.StudentOrderByWithRelationInput = {
    [query.sort]: query.order,
  };

  const [total, rows] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy,
      skip,
      take: query.pageSize,
    }),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    items: rows.map(toListItem),
  };
}

export async function getStudentById(
  studentId: string,
): Promise<StudentDetail> {
  const normalized = studentId.trim().toUpperCase();
  const student = await prisma.student.findUnique({
    where: { studentId: normalized },
  });

  if (!student) {
    throw new ImportClientError("NOT_FOUND", "Student not found.", 404);
  }

  const grading = gradeStudent({
    maths: student.maths,
    science: student.science,
    english: student.english,
    socialStudies: student.socialStudies,
    secondLanguage: student.secondLanguage,
  });

  return {
    ...toListItem(student),
    dateOfBirth: student.dateOfBirth.toISOString().slice(0, 10),
    age: ageOnDate(student.dateOfBirth, new Date()),
    maths: student.maths,
    science: student.science,
    english: student.english,
    socialStudies: student.socialStudies,
    secondLanguage: student.secondLanguage,
    totalMarks: Number(grading.totalMarks.toFixed(2)),
    failedSubjects: grading.failedSubjects,
    createdAt: student.createdAt.toISOString(),
    updatedAt: student.updatedAt.toISOString(),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const [totalStudents, byGradeLevel, bySection, recentBatches] =
    await Promise.all([
      prisma.student.count(),
      prisma.student.groupBy({
        by: ["gradeLevel"],
        _count: { _all: true },
        orderBy: { gradeLevel: "asc" },
      }),
      prisma.student.groupBy({
        by: ["section"],
        _count: { _all: true },
        orderBy: { section: "asc" },
      }),
      prisma.importBatch.findMany({
        orderBy: { importedAt: "desc" },
        take: 5,
        include: { _count: { select: { errors: true } } },
      }),
    ]);

  const mapped = recentBatches.map((batch) => ({
    importId: batch.id,
    filename: batch.filename,
    status: batch.status,
    totalRows: batch.totalRows,
    acceptedRows: batch.importedRows,
    rejectedRows: batch.rejectedRows,
    skippedRows: batch.skippedRows,
    errorCount: batch._count.errors,
    importedAt: batch.importedAt.toISOString(),
  }));

  return {
    totalStudents,
    byGradeLevel: byGradeLevel.map((row) => ({
      gradeLevel: row.gradeLevel,
      count: row._count._all,
    })),
    bySection: bySection.map((row) => ({
      section: row.section,
      count: row._count._all,
    })),
    recentImports: mapped,
    latestImport: mapped[0] ?? null,
  };
}
