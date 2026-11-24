import type { FieldValidationError } from "@/types/import";

const FORMULA_PREFIX = /^[=+\-@].*/;

/**
 * Neutralize spreadsheet formula injection for CSV downloads.
 * Prefixes risky values with a single quote so Excel/Sheets treat them as text.
 */
export function sanitizeCsvCell(value: string | null | undefined): string {
  if (value == null) return "";
  const text = String(value);
  if (FORMULA_PREFIX.test(text) || text.startsWith("\t") || text.startsWith("\r")) {
    return `'${text}`;
  }
  return text;
}

export function escapeCsvField(value: string | null | undefined): string {
  const sanitized = sanitizeCsvCell(value);
  if (/[",\r\n]/.test(sanitized)) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export function buildErrorReportCsv(
  rows: Array<{
    rowNumber: number;
    studentId: string | null;
    field: string | null;
    errorCode: string;
    message: string;
    rejectedValue: string | null;
  }>,
): string {
  const header = [
    "row_number",
    "student_id",
    "field",
    "error_code",
    "message",
    "rejected_value",
  ].join(",");

  const lines = rows.map((row) =>
    [
      escapeCsvField(String(row.rowNumber)),
      escapeCsvField(row.studentId),
      escapeCsvField(row.field),
      escapeCsvField(row.errorCode),
      escapeCsvField(row.message),
      escapeCsvField(row.rejectedValue),
    ].join(","),
  );

  return `${[header, ...lines].join("\r\n")}\r\n`;
}

export function flattenRowErrors(
  rowNumber: number,
  studentId: string | null,
  errors: FieldValidationError[],
): Array<{
  rowNumber: number;
  studentId: string | null;
  field: string | null;
  errorCode: string;
  message: string;
  rejectedValue: string | null;
}> {
  return errors.map((error) => ({
    rowNumber,
    studentId,
    field: error.field,
    errorCode: error.code,
    message: error.message,
    rejectedValue: error.rejectedValue ?? null,
  }));
}
