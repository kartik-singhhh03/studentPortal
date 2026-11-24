import { ImportClientError } from "@/lib/import/errors";

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "text/csv",
  "application/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);

export function getMaxUploadBytes(): number {
  const raw = process.env.MAX_UPLOAD_BYTES;
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MAX_UPLOAD_BYTES;
  return Math.floor(parsed);
}

export function assertCsvUpload(
  file: File | null,
  maxBytes: number,
): asserts file is File {
  if (!file) {
    throw new ImportClientError(
      "MISSING_FILE",
      "A CSV file is required. Upload using multipart field name \"file\".",
      400,
    );
  }

  const filename = file.name?.trim() || "upload.csv";
  const lowerName = filename.toLowerCase();
  if (!lowerName.endsWith(".csv")) {
    throw new ImportClientError(
      "INVALID_FILE_TYPE",
      "Only .csv files are supported.",
      400,
      { filename },
    );
  }

  const mime = (file.type || "").toLowerCase();
  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    throw new ImportClientError(
      "INVALID_FILE_TYPE",
      "Unsupported file type. Upload a CSV file.",
      400,
      { mime },
    );
  }

  if (file.size <= 0) {
    throw new ImportClientError("EMPTY_FILE", "The uploaded file is empty.", 400);
  }

  if (file.size > maxBytes) {
    throw new ImportClientError(
      "FILE_TOO_LARGE",
      `File exceeds the maximum upload size of ${maxBytes} bytes.`,
      413,
      { maxBytes, size: file.size },
    );
  }
}

export async function readUploadBytes(
  file: File | null,
  maxBytes: number,
): Promise<Buffer> {
  assertCsvUpload(file, maxBytes);
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.byteLength > maxBytes) {
    throw new ImportClientError(
      "FILE_TOO_LARGE",
      `File exceeds the maximum upload size of ${maxBytes} bytes.`,
      413,
      { maxBytes, size: bytes.byteLength },
    );
  }
  if (bytes.byteLength === 0) {
    throw new ImportClientError("EMPTY_FILE", "The uploaded file is empty.", 400);
  }
  return bytes;
}
