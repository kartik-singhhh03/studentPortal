export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatMark(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function importStatusLabel(status: string): string {
  switch (status) {
    case "PROCESSING":
      return "Processing";
    case "COMPLETED":
      return "Completed";
    case "FAILED":
      return "Failed";
    case "SKIPPED_IDENTICAL":
      return "Skipped (identical)";
    default:
      return status;
  }
}

/**
 * Human-readable import counts that keep skipped rows separate from
 * accepted/rejected totals (totalRows === accepted + rejected).
 */
export function describeImportCounts(input: {
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  skippedRows: number;
}): string {
  const processed = `${input.totalRows} processed · ${input.acceptedRows} accepted · ${input.rejectedRows} rejected`;
  if (input.skippedRows > 0) {
    return `${processed} · ${input.skippedRows} blank skipped`;
  }
  return processed;
}
