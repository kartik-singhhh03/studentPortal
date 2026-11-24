import Link from "next/link";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { Pagination } from "@/components/students/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { ImportClientError } from "@/lib/import/errors";
import {
  getImportBatch,
  listImportErrors,
} from "@/lib/import/import-service";
import { parsePagination } from "@/lib/import/pagination";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ importId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ImportDetailPage({
  params,
  searchParams,
}: RouteContext) {
  const { importId } = await params;
  const raw = await searchParams;
  const query = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "string") query.set(key, value);
  });

  let summary;
  let errors;
  try {
    const pagination = parsePagination(query);
    summary = await getImportBatch(importId);
    errors = await listImportErrors({
      importId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
  } catch (error) {
    const notFound =
      error instanceof ImportClientError && error.code === "NOT_FOUND";
    return (
      <div>
        <PageHeader title="Import details" />
        <ErrorState
          title={notFound ? "Import not found" : "Could not load import"}
          message={
            notFound
              ? "That import batch does not exist."
              : "Please return to import history and try again."
          }
        />
        <div className="mt-4">
          <Link
            href="/imports"
            className="text-sm text-charcoal underline-offset-2 hover:underline"
          >
            Back to import history
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={summary.filename}
        description="Import summary and validation errors for administrators."
        actions={
          <>
            <Link
              href="/imports"
              className="rounded border border-border bg-white px-3 py-2 text-sm hover:bg-off-white"
            >
              Back
            </Link>
            {summary.errorCount > 0 ? (
              <a
                href={`/api/imports/${importId}/errors/download`}
                className="rounded border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white"
              >
                Download errors
              </a>
            ) : null}
          </>
        }
      />

      <section className="rounded border border-border bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <ImportStatusBadge status={summary.status} />
          <span className="text-sm text-neutral">
            Imported {formatDateTime(summary.importedAt)}
          </span>
        </div>
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
      </section>

      <section className="mt-6">
        <h2 className="mb-3 text-sm font-medium text-near-black">
          Validation errors
        </h2>
        {errors.total === 0 ? (
          <EmptyState
            title="No validation errors"
            description="Every processed data row in this file was accepted."
          />
        ) : (
          <>
            <div className="overflow-x-auto rounded border border-border bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
                  <tr>
                    <th className="px-4 py-3 font-medium">Row</th>
                    <th className="px-4 py-3 font-medium">Student ID</th>
                    <th className="px-4 py-3 font-medium">Field</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Message</th>
                    <th className="px-4 py-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {errors.items.map((error) => (
                    <tr
                      key={error.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="px-4 py-3 font-mono text-xs">
                        {error.rowNumber}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {error.studentId ?? "—"}
                      </td>
                      <td className="px-4 py-3">{error.field ?? "—"}</td>
                      <td className="px-4 py-3">{error.errorCode}</td>
                      <td className="px-4 py-3">{error.message}</td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {error.rejectedValue ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              basePath={`/imports/${importId}`}
              page={errors.page}
              totalPages={errors.totalPages}
              total={errors.total}
              pageSize={errors.pageSize}
              searchParams={{}}
            />
          </>
        )}
      </section>
    </div>
  );
}
