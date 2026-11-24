export const IMPORT_ERROR_CODES = [
  "MISSING_REQUIRED",
  "INVALID_FORMAT",
  "OUT_OF_RANGE",
  "DUPLICATE_ID",
  "WRONG_FIELD_COUNT",
] as const;

export type ImportErrorCode = (typeof IMPORT_ERROR_CODES)[number];

export const REQUIRED_CSV_HEADERS = [
  "student_id",
  "full_name",
  "email",
  "date_of_birth",
  "grade_level",
  "section",
  "maths",
  "science",
  "english",
  "social_studies",
  "second_language",
] as const;

export type RequiredCsvHeader = (typeof REQUIRED_CSV_HEADERS)[number];

export interface FieldValidationError {
  field: RequiredCsvHeader | null;
  code: ImportErrorCode;
  message: string;
}

export interface ValidatedStudentRow {
  studentId: string;
  fullName: string;
  email: string;
  dateOfBirth: Date;
  gradeLevel: number;
  section: string;
  maths: number;
  science: number;
  english: number;
  socialStudies: number;
  secondLanguage: number;
}
