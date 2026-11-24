import Link from "next/link";

export function Pagination({
  basePath,
  page,
  totalPages,
  total,
  pageSize,
  searchParams,
}: {
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  searchParams: Record<string, string | undefined>;
}) {
  function hrefFor(nextPage: number): string {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    params.set("page", String(nextPage));
    params.set("pageSize", String(pageSize));
    return `${basePath}?${params.toString()}`;
  }

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-neutral">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-2">
        {page > 1 ? (
          <Link
            href={hrefFor(page - 1)}
            className="rounded border border-border bg-white px-3 py-1.5 text-sm text-near-black hover:bg-off-white"
          >
            Previous
          </Link>
        ) : (
          <span className="rounded border border-border px-3 py-1.5 text-sm text-neutral">
            Previous
          </span>
        )}
        <span className="text-sm text-charcoal">
          Page {page} of {totalPages}
        </span>
        {page < totalPages ? (
          <Link
            href={hrefFor(page + 1)}
            className="rounded border border-border bg-white px-3 py-1.5 text-sm text-near-black hover:bg-off-white"
          >
            Next
          </Link>
        ) : (
          <span className="rounded border border-border px-3 py-1.5 text-sm text-neutral">
            Next
          </span>
        )}
      </div>
    </div>
  );
}
