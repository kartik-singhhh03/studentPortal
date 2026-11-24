import Link from "next/link";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { Pagination } from "@/components/students/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";
import { listImportBatches } from "@/lib/import/import-service";
import { parsePagination } from "@/lib/import/pagination";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ImportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const raw = await searchParams;
  const params = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (typeof value === "string") params.set(key, value);
  });

  let result;
  try {
    const pagination = parsePagination(params);
    result = await listImportBatches(pagination);
  } catch {
    return (
      <div>
        <PageHeader
          title="Import history"
          description="Past CSV uploads and their outcomes."
        />
        <ErrorState message="Could not load import history." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Import history"
        description={`${result.total.toLocaleString()} import batch${result.total === 1 ? "" : "es"} recorded.`}
        actions={
          <Link
            href="/import"
            className="rounded-[var(--radius-sm)] border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal"
          >
            Import CSV
          </Link>
        }
      />

      {result.total === 0 ? (
        <EmptyState
          title="No imports yet"
          description="Upload a CSV to see import history here."
          action={
            <Link
              href="/import"
              className="rounded-[var(--radius-sm)] border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white"
            >
              Import CSV
            </Link>
          }
        />
      ) : (
        <>
          <div className="surface overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
                <tr>
                  <th className="px-4 py-3 font-medium">Filename</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Counts</th>
                  <th className="px-4 py-3 font-medium">Errors</th>
                  <th className="px-4 py-3 font-medium">Imported</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr
                    key={item.importId}
                    className="table-row-hover border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3.5 font-medium text-near-black">
                      {item.filename}
                    </td>
                    <td className="px-4 py-3.5">
                      <ImportStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <ImportCounts
                        totalRows={item.totalRows}
                        acceptedRows={item.acceptedRows}
                        rejectedRows={item.rejectedRows}
                        skippedRows={item.skippedRows}
                      />
                    </td>
                    <td className="px-4 py-3.5 text-charcoal">{item.errorCount}</td>
                    <td className="px-4 py-3.5 text-charcoal">
                      {formatDateTime(item.importedAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/imports/${item.importId}`}
                        className="font-medium underline-offset-2 hover:underline"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            basePath="/imports"
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            searchParams={{}}
          />
        </>
      )}
    </div>
  );
}
