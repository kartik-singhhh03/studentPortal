import { parse } from "csv-parse/sync";
import { ImportClientError } from "@/lib/import/errors";
import {
  REQUIRED_CSV_HEADERS,
  type ParsedCsvFile,
  type ParsedCsvRow,
  type RequiredCsvHeader,
} from "@/types/import";

type CsvInfoRecord = {
  record: string[];
  info: { lines: number };
};

function normalizeHeader(value: string): string {
  return value.replace(/^\uFEFF/, "").trim().toLowerCase();
}

function isEntirelyEmpty(fields: string[]): boolean {
  return fields.every((field) => field.trim() === "");
}

/**
 * Parses CSV bytes into header-mapped rows with physical line numbers.
 * Blank / all-empty rows are skipped (not counted as rows read) but still
 * advance physical line numbers via csv-parse `info.lines`.
 */
export function parseStudentCsv(bytes: Buffer): ParsedCsvFile {
  let records: CsvInfoRecord[];

  try {
    records = parse(bytes, {
      bom: true,
      columns: false,
      relax_column_count: true,
      skip_empty_lines: false,
      trim: false,
      info: true,
      encoding: "utf8",
    }) as unknown as CsvInfoRecord[];
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code: unknown }).code)
        : "PARSE_ERROR";
    throw new ImportClientError(
      "INVALID_CSV",
      "The CSV file could not be parsed. Check quoting and structure.",
      400,
      { reason: code },
    );
  }

  if (records.length === 0) {
    throw new ImportClientError(
      "EMPTY_FILE",
      "The CSV file has no header row.",
      400,
    );
  }

  const headerRecord = records[0];
  const rawHeaders = headerRecord.record.map(normalizeHeader);

  if (rawHeaders.length === 0 || rawHeaders.every((h) => h === "")) {
    throw new ImportClientError(
      "MISSING_HEADERS",
      "The CSV header row is missing or empty.",
      400,
    );
  }

  const headerMap = new Map<RequiredCsvHeader, number>();
  rawHeaders.forEach((header, index) => {
    if (!header) return;
    for (const required of REQUIRED_CSV_HEADERS) {
      if (header === required && !headerMap.has(required)) {
        headerMap.set(required, index);
      }
    }
  });

  const missingHeaders = REQUIRED_CSV_HEADERS.filter(
    (header) => !headerMap.has(header),
  );
  if (missingHeaders.length > 0) {
    throw new ImportClientError(
      "MISSING_HEADERS",
      "One or more required CSV columns are missing.",
      400,
      { missingHeaders },
    );
  }

  const rows: ParsedCsvRow[] = [];
  let skippedRows = 0;

  for (let i = 1; i < records.length; i++) {
    const entry = records[i];
    const fields = entry.record;
    const rowNumber = entry.info.lines;

    if (isEntirelyEmpty(fields)) {
      skippedRows += 1;
      continue;
    }

    rows.push({ rowNumber, fields });
  }

  return {
    headers: rawHeaders,
    headerMap,
    rows,
    skippedRows,
    rowsRead: rows.length,
  };
}

export function getField(
  row: ParsedCsvRow,
  headerMap: Map<RequiredCsvHeader, number>,
  header: RequiredCsvHeader,
): string {
  const index = headerMap.get(header);
  if (index === undefined) return "";
  return row.fields[index] ?? "";
}
