import type { GradingResult } from "@/lib/grading";

export interface StudentListItem {
  studentId: string;
  fullName: string;
  email: string;
  gradeLevel: number;
  section: string;
  percentage: number;
  letterGrade: string;
  passed: boolean;
}

export interface StudentDetail extends StudentListItem {
  dateOfBirth: string;
  age: number;
  maths: number;
  science: number;
  english: number;
  socialStudies: number;
  secondLanguage: number;
  totalMarks: number;
  failedSubjects: GradingResult["failedSubjects"];
  createdAt: string;
  updatedAt: string;
}

export interface StudentsListResponse {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: StudentListItem[];
}

export interface DashboardStats {
  totalStudents: number;
  byGradeLevel: Array<{ gradeLevel: number; count: number }>;
  bySection: Array<{ section: string; count: number }>;
  recentImports: Array<{
    importId: string;
    filename: string;
    status: string;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    skippedRows: number;
    errorCount: number;
    importedAt: string;
  }>;
  latestImport: {
    importId: string;
    filename: string;
    status: string;
    totalRows: number;
    acceptedRows: number;
    rejectedRows: number;
    skippedRows: number;
    errorCount: number;
    importedAt: string;
  } | null;
}
