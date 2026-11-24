"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { ProgressIndeterminate } from "@/components/ui/progress-indeterminate";
import { ApiError, parseJsonResponse } from "@/lib/api/http";
import { formatBytes, formatDateTime } from "@/lib/format";
import type { ImportSummary } from "@/types/import";

type UploadErrorRow = {
  rowNumber: number;
  studentId: string | null;
  field: string | null;
  errorCode: string;
  message: string;
  rejectedValue: string | null;
};

type UploadPhase = "idle" | "uploading" | "processing";

const DEFAULT_MAX = 4 * 1024 * 1024;

export function CsvUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<UploadErrorRow[]>([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorPage, setErrorPage] = useState(1);
  const [maxUploadBytes, setMaxUploadBytes] = useState(DEFAULT_MAX);
  const [inProgressImportId, setInProgressImportId] = useState<string | null>(
    null,
  );

  const busy = phase !== "idle";

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: { maxUploadBytes?: number }) => {
        if (typeof data.maxUploadBytes === "number") {
          setMaxUploadBytes(data.maxUploadBytes);
        }
      })
      .catch(() => undefined);
  }, []);

  const validateFile = useCallback(
    (next: File | null) => {
      setClientError(null);
      setServerError(null);
      setSummary(null);
      setErrors([]);
      setErrorTotal(0);
      setInProgressImportId(null);
      if (!next) {
        setFile(null);
        return;
      }
      if (!next.name.toLowerCase().endsWith(".csv")) {
        setFile(null);
        setClientError("Please choose a .csv file.");
        return;
      }
      if (next.size <= 0) {
        setFile(null);
        setClientError("The selected file is empty.");
        return;
      }
      if (next.size > maxUploadBytes) {
        setFile(null);
        setClientError(
          `File is too large. Maximum size is ${formatBytes(maxUploadBytes)}.`,
        );
        return;
      }
      setFile(next);
    },
    [maxUploadBytes],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setDragOver(false);
      const next = event.dataTransfer.files?.[0] ?? null;
      validateFile(next);
    },
    [validateFile],
  );

  const canUpload = Boolean(file) && !busy;

  const resultMessage = useMemo(() => {
    if (!summary) return null;
    if (summary.status === "SKIPPED_IDENTICAL") {
      return "This file was already imported successfully. No changes were made.";
    }
    if (summary.status === "FAILED") {
      return "Import failed after processing started. You can retry the same file; accepted students already written will be upserted safely.";
    }
    if (summary.rejectedRows === 0) {
      return "Import completed successfully. All processed rows were accepted.";
    }
    return "Import completed with some rejected rows. Review the validation errors below. Blank rows are listed separately and are not part of processed totals.";
  }, [summary]);

  async function loadErrors(importId: string, page: number) {
    const response = await fetch(
      `/api/imports/${importId}/errors?page=${page}&pageSize=20`,
    );
    const data = await parseJsonResponse<{
      items: UploadErrorRow[];
      total: number;
      page: number;
    }>(response);
    setErrors(data.items);
    setErrorTotal(data.total);
    setErrorPage(data.page);
  }

  async function onUpload() {
    if (!file || busy) return;
    setPhase("uploading");
    setServerError(null);
    setSummary(null);
    setInProgressImportId(null);
    try {
      const form = new FormData();
      form.append("file", file);
      setPhase("processing");
      const response = await fetch("/api/imports", {
        method: "POST",
        body: form,
      });
      const data = await parseJsonResponse<ImportSummary>(response);
      setSummary(data);
      if (data.errorCount > 0 && data.importId) {
        await loadErrors(
          data.status === "SKIPPED_IDENTICAL" && data.originalImportId
            ? data.originalImportId
            : data.importId,
          1,
        );
      } else {
        setErrors([]);
        setErrorTotal(0);
      }
    } catch (error) {
      if (error instanceof ApiError && error.code === "IMPORT_IN_PROGRESS") {
        setServerError(error.message);
        const importId = error.details?.importId;
        setInProgressImportId(typeof importId === "string" ? importId : null);
      } else {
        const message =
          error instanceof ApiError
            ? error.message
            : "Upload failed. Please try again.";
        setServerError(message);
      }
    } finally {
      setPhase("idle");
    }
  }

  const activeImportId =
    summary?.status === "SKIPPED_IDENTICAL" && summary.originalImportId
      ? summary.originalImportId
      : summary?.importId;

  const phaseLabel =
    phase === "uploading"
      ? "Uploading file…"
      : phase === "processing"
        ? "Processing CSV — validating and writing to the database…"
        : null;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`dropzone surface px-6 py-10 text-center ${
          dragOver
            ? "border-near-black bg-off-white shadow-[var(--shadow-md)]"
            : "border-dashed"
        }`}
      >
        <p className="text-sm font-medium text-near-black">
          Drag and drop a CSV file here
        </p>
        <p className="mt-1 text-sm text-neutral">
          or choose a file · max {formatBytes(maxUploadBytes)}
        </p>
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm font-medium text-near-black transition-colors hover:bg-off-white">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={busy}
              onChange={(event) =>
                validateFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>
      </div>

      {file ? (
        <div className="surface flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium text-near-black">{file.name}</p>
            <p className="text-neutral">{formatBytes(file.size)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => validateFile(null)}
              disabled={busy}
            >
              Remove
            </Button>
            <Button type="button" onClick={onUpload} disabled={!canUpload}>
              {busy ? "Working…" : "Upload CSV"}
            </Button>
          </div>
        </div>
      ) : null}

      {phaseLabel ? <ProgressIndeterminate label={phaseLabel} /> : null}

      {clientError ? <ErrorState message={clientError} /> : null}
      {serverError ? (
        <ErrorState
          title={
            inProgressImportId || serverError.includes("already being imported")
              ? "Import already in progress"
              : "Upload failed"
          }
          message={serverError}
        />
      ) : null}

      {summary ? (
        <section className="surface p-5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-medium text-near-black">
              Import result
            </h2>
            <ImportStatusBadge status={summary.status} />
          </div>
          {resultMessage ? (
            <p className="mt-2 text-sm text-charcoal">{resultMessage}</p>
          ) : null}

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral">
                Filename
              </dt>
              <dd className="mt-1 text-sm">{summary.filename}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-neutral">
                Completed
              </dt>
              <dd className="mt-1 text-sm">
                {formatDateTime(summary.completedAt)}
              </dd>
            </div>
          </dl>

          <div className="mt-4">
            <ImportCounts
              totalRows={summary.totalRows}
              acceptedRows={summary.acceptedRows}
              rejectedRows={summary.rejectedRows}
              skippedRows={summary.skippedRows}
            />
            <p className="mt-2 text-sm text-neutral">
              Validation error records: {summary.errorCount}
            </p>
          </div>

          {activeImportId ? (
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/imports/${activeImportId}`}
                className="text-sm font-medium text-near-black underline-offset-2 hover:underline"
              >
                Open import details
              </Link>
              {summary.errorCount > 0 ? (
                <a
                  href={`/api/imports/${activeImportId}/errors/download`}
                  className="text-sm font-medium text-near-black underline-offset-2 hover:underline"
                >
                  Download error report
                </a>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {errors.length > 0 ? (
        <section className="surface overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-medium text-near-black">
              Validation errors
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
                <tr>
                  <th className="px-4 py-3 font-medium">Row</th>
                  <th className="px-4 py-3 font-medium">Field</th>
                  <th className="px-4 py-3 font-medium">Message</th>
                  <th className="px-4 py-3 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {errors.map((error) => (
                  <tr
                    key={`${error.rowNumber}-${error.field}-${error.errorCode}-${error.message}`}
                    className="table-row-hover border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 font-mono text-xs">
                      {error.rowNumber}
                    </td>
                    <td className="px-4 py-3">{error.field ?? "—"}</td>
                    <td className="px-4 py-3">{error.message}</td>
                    <td className="px-4 py-3 font-mono text-xs text-charcoal">
                      {error.rejectedValue ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errorTotal > errors.length && activeImportId ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-neutral">
                Showing page {errorPage} · {errorTotal} errors
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={errorPage <= 1 || busy}
                  onClick={() => loadErrors(activeImportId, errorPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={errorPage * 20 >= errorTotal || busy}
                  onClick={() => loadErrors(activeImportId, errorPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
