"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
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

const DEFAULT_MAX = 5 * 1024 * 1024;

export function CsvUploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [errors, setErrors] = useState<UploadErrorRow[]>([]);
  const [errorTotal, setErrorTotal] = useState(0);
  const [errorPage, setErrorPage] = useState(1);
  const [maxUploadBytes, setMaxUploadBytes] = useState(DEFAULT_MAX);

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

  const canUpload = Boolean(file) && !uploading;

  const resultMessage = useMemo(() => {
    if (!summary) return null;
    if (summary.status === "SKIPPED_IDENTICAL") {
      return "This file was already imported. No changes were made.";
    }
    if (summary.rejectedRows === 0) {
      return "Import completed successfully. All processed rows were accepted.";
    }
    return "Import completed with some rejected rows. Review the validation errors below.";
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
    if (!file || uploading) return;
    setUploading(true);
    setServerError(null);
    try {
      const form = new FormData();
      form.append("file", file);
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
      const message =
        error instanceof ApiError
          ? error.message
          : "Upload failed. Please try again.";
      setServerError(message);
    } finally {
      setUploading(false);
    }
  }

  const activeImportId =
    summary?.status === "SKIPPED_IDENTICAL" && summary.originalImportId
      ? summary.originalImportId
      : summary?.importId;

  return (
    <div className="space-y-6">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`rounded border border-dashed bg-white px-6 py-10 text-center ${
          dragOver ? "border-near-black bg-off-white" : "border-border"
        }`}
      >
        <p className="text-sm font-medium text-near-black">
          Drag and drop a CSV file here
        </p>
        <p className="mt-1 text-sm text-neutral">
          or choose a file · max {formatBytes(maxUploadBytes)}
        </p>
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center rounded border border-border bg-white px-3 py-2 text-sm font-medium text-near-black hover:bg-off-white">
            Choose file
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) =>
                validateFile(event.target.files?.[0] ?? null)
              }
            />
          </label>
        </div>
      </div>

      {file ? (
        <div className="flex flex-col gap-3 rounded border border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium text-near-black">{file.name}</p>
            <p className="text-neutral">{formatBytes(file.size)}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => validateFile(null)}
              disabled={uploading}
            >
              Remove
            </Button>
            <Button type="button" onClick={onUpload} disabled={!canUpload}>
              {uploading ? "Uploading…" : "Upload CSV"}
            </Button>
          </div>
        </div>
      ) : null}

      {clientError ? <ErrorState message={clientError} /> : null}
      {serverError ? <ErrorState message={serverError} /> : null}

      {summary ? (
        <section className="rounded border border-border bg-white p-5">
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
              Error records: {summary.errorCount}
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
        <section className="overflow-hidden rounded border border-border bg-white">
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
                    className="border-b border-border last:border-0"
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
                  disabled={errorPage <= 1 || uploading}
                  onClick={() => loadErrors(activeImportId, errorPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={errorPage * 20 >= errorTotal || uploading}
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
