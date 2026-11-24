import {
  ageOnDate,
  emailSchema,
  fullNameSchema,
  gradeLevelSchema,
  markSchema,
  parseDateOfBirth,
  sectionSchema,
  studentIdSchema,
} from "@/lib/validation/student-fields";
import { getField } from "@/lib/import/csv-parser";
import type {
  FieldValidationError,
  ParsedCsvFile,
  ParsedCsvRow,
  RequiredCsvHeader,
  RowValidationResult,
  ValidatedStudentRow,
} from "@/types/import";

function pushError(
  errors: FieldValidationError[],
  field: RequiredCsvHeader | null,
  code: FieldValidationError["code"],
  message: string,
  rejectedValue?: string | null,
): void {
  errors.push({
    field,
    code,
    message,
    rejectedValue: rejectedValue ?? null,
  });
}

function validateMark(
  raw: string,
  field: RequiredCsvHeader,
  errors: FieldValidationError[],
): number | null {
  if (raw.trim() === "") {
    pushError(errors, field, "MISSING_REQUIRED", `${field} is required.`, raw);
    return null;
  }

  const parsed = markSchema.safeParse(raw);
  if (!parsed.success) {
    const isFormat = !/^-?\d+(\.\d+)?$/.test(raw.trim());
    pushError(
      errors,
      field,
      isFormat ? "INVALID_FORMAT" : "OUT_OF_RANGE",
      isFormat
        ? `${field} must be a number.`
        : `${field} must be between 0 and 100.`,
      raw,
    );
    return null;
  }

  return parsed.data;
}

/**
 * Validates a single data row. Collects every independent field error.
 * Wrong field counts produce only WRONG_FIELD_COUNT.
 */
export function validateCsvRow(
  row: ParsedCsvRow,
  parsedFile: ParsedCsvFile,
  importDate: Date,
  seenStudentIds: Set<string>,
): RowValidationResult {
  const { headerMap, headers } = parsedFile;
  const errors: FieldValidationError[] = [];

  const rawStudentId = getField(row, headerMap, "student_id");
  const trimmedId = rawStudentId.trim();
  const normalizedIdCandidate = trimmedId.toUpperCase();

  if (row.fields.length !== headers.length) {
    // Still reserve the ID so later duplicates are consistent.
    if (normalizedIdCandidate && !seenStudentIds.has(normalizedIdCandidate)) {
      seenStudentIds.add(normalizedIdCandidate);
    }

    pushError(
      errors,
      null,
      "WRONG_FIELD_COUNT",
      `Expected ${headers.length} fields but found ${row.fields.length}.`,
      null,
    );

    return {
      rowNumber: row.rowNumber,
      studentId: normalizedIdCandidate || null,
      accepted: null,
      errors,
    };
  }

  const isDuplicate =
    Boolean(normalizedIdCandidate) &&
    seenStudentIds.has(normalizedIdCandidate);

  if (normalizedIdCandidate && !seenStudentIds.has(normalizedIdCandidate)) {
    seenStudentIds.add(normalizedIdCandidate);
  }

  let studentId: string | null = null;
  if (trimmedId === "") {
    pushError(
      errors,
      "student_id",
      "MISSING_REQUIRED",
      "student_id is required.",
      rawStudentId,
    );
  } else {
    const idParsed = studentIdSchema.safeParse(rawStudentId);
    if (!idParsed.success) {
      pushError(
        errors,
        "student_id",
        "INVALID_FORMAT",
        "student_id must be 3–20 characters using letters, digits, or hyphens.",
        rawStudentId,
      );
    } else {
      studentId = idParsed.data;
    }
  }

  if (isDuplicate) {
    pushError(
      errors,
      "student_id",
      "DUPLICATE_ID",
      "Duplicate student_id within this file. The first occurrence is kept.",
      rawStudentId,
    );
  }

  const rawName = getField(row, headerMap, "full_name");
  let fullName: string | null = null;
  if (rawName.trim() === "") {
    pushError(
      errors,
      "full_name",
      "MISSING_REQUIRED",
      "full_name is required.",
      rawName,
    );
  } else {
    const nameParsed = fullNameSchema.safeParse(rawName);
    if (!nameParsed.success) {
      pushError(
        errors,
        "full_name",
        "OUT_OF_RANGE",
        "full_name must be between 2 and 100 characters after trimming.",
        rawName,
      );
    } else {
      fullName = nameParsed.data;
    }
  }

  const rawEmail = getField(row, headerMap, "email");
  let email: string | null = null;
  if (rawEmail.trim() === "") {
    pushError(
      errors,
      "email",
      "MISSING_REQUIRED",
      "email is required.",
      rawEmail,
    );
  } else {
    const emailParsed = emailSchema.safeParse(rawEmail);
    if (!emailParsed.success) {
      pushError(
        errors,
        "email",
        "INVALID_FORMAT",
        "email must be a valid email address.",
        rawEmail,
      );
    } else {
      email = emailParsed.data;
    }
  }

  const rawDob = getField(row, headerMap, "date_of_birth");
  let dateOfBirth: Date | null = null;
  if (rawDob.trim() === "") {
    pushError(
      errors,
      "date_of_birth",
      "MISSING_REQUIRED",
      "date_of_birth is required.",
      rawDob,
    );
  } else {
    const parsedDob = parseDateOfBirth(rawDob);
    if (!parsedDob) {
      pushError(
        errors,
        "date_of_birth",
        "INVALID_FORMAT",
        "date_of_birth must be a real date in YYYY-MM-DD or DD/MM/YYYY format.",
        rawDob,
      );
    } else {
      const age = ageOnDate(parsedDob, importDate);
      if (age < 5 || age > 25) {
        pushError(
          errors,
          "date_of_birth",
          "OUT_OF_RANGE",
          "Student age must be between 5 and 25 years on the import date.",
          rawDob,
        );
      } else {
        dateOfBirth = parsedDob;
      }
    }
  }

  const rawGrade = getField(row, headerMap, "grade_level");
  let gradeLevel: number | null = null;
  if (rawGrade.trim() === "") {
    pushError(
      errors,
      "grade_level",
      "MISSING_REQUIRED",
      "grade_level is required.",
      rawGrade,
    );
  } else {
    const gradeParsed = gradeLevelSchema.safeParse(rawGrade);
    if (!gradeParsed.success) {
      const isFormat = !/^\d+$/.test(rawGrade.trim());
      pushError(
        errors,
        "grade_level",
        isFormat ? "INVALID_FORMAT" : "OUT_OF_RANGE",
        isFormat
          ? "grade_level must be a whole number."
          : "grade_level must be between 1 and 12.",
        rawGrade,
      );
    } else {
      gradeLevel = gradeParsed.data;
    }
  }

  const rawSection = getField(row, headerMap, "section");
  let section: string | null = null;
  if (rawSection.trim() === "") {
    pushError(
      errors,
      "section",
      "MISSING_REQUIRED",
      "section is required.",
      rawSection,
    );
  } else {
    const sectionParsed = sectionSchema.safeParse(rawSection);
    if (!sectionParsed.success) {
      pushError(
        errors,
        "section",
        "INVALID_FORMAT",
        "section must be a letter from A to F.",
        rawSection,
      );
    } else {
      section = sectionParsed.data;
    }
  }

  const maths = validateMark(getField(row, headerMap, "maths"), "maths", errors);
  const science = validateMark(
    getField(row, headerMap, "science"),
    "science",
    errors,
  );
  const english = validateMark(
    getField(row, headerMap, "english"),
    "english",
    errors,
  );
  const socialStudies = validateMark(
    getField(row, headerMap, "social_studies"),
    "social_studies",
    errors,
  );
  const secondLanguage = validateMark(
    getField(row, headerMap, "second_language"),
    "second_language",
    errors,
  );

  if (errors.length > 0) {
    return {
      rowNumber: row.rowNumber,
      studentId: studentId ?? (normalizedIdCandidate || null),
      accepted: null,
      errors,
    };
  }

  const accepted: ValidatedStudentRow = {
    studentId: studentId!,
    fullName: fullName!,
    email: email!,
    dateOfBirth: dateOfBirth!,
    gradeLevel: gradeLevel!,
    section: section!,
    maths: maths!,
    science: science!,
    english: english!,
    socialStudies: socialStudies!,
    secondLanguage: secondLanguage!,
  };

  return {
    rowNumber: row.rowNumber,
    studentId: accepted.studentId,
    accepted,
    errors: [],
  };
}

export function validateParsedCsv(
  parsedFile: ParsedCsvFile,
  importDate: Date = new Date(),
): RowValidationResult[] {
  const seenStudentIds = new Set<string>();
  return parsedFile.rows.map((row) =>
    validateCsvRow(row, parsedFile, importDate, seenStudentIds),
  );
}
