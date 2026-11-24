import Link from "next/link";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { formatDateTime } from "@/lib/format";
import { getDashboardStats } from "@/lib/students/student-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let stats;
  try {
    stats = await getDashboardStats();
  } catch {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Overview of imported students and recent CSV processing."
        />
        <ErrorState message="Could not load dashboard statistics. Please try again." />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of imported students and recent CSV processing."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={String(stats.totalStudents)} />
        <StatCard
          label="Grade levels"
          value={String(stats.byGradeLevel.length)}
        />
        <StatCard label="Sections" value={String(stats.bySection.length)} />
        <StatCard
          label="Latest import"
          value={
            stats.latestImport
              ? stats.latestImport.status === "COMPLETED"
                ? "Completed"
                : stats.latestImport.status === "FAILED"
                  ? "Failed"
                  : "Skipped"
              : "None"
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded border border-border bg-white p-5">
          <h2 className="text-sm font-medium text-near-black">
            Students by grade
          </h2>
          {stats.byGradeLevel.length === 0 ? (
            <p className="mt-4 text-sm text-neutral">No students imported yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {stats.byGradeLevel.map((row) => (
                <li
                  key={row.gradeLevel}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-charcoal">Grade {row.gradeLevel}</span>
                  <span className="font-medium text-near-black">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded border border-border bg-white p-5">
          <h2 className="text-sm font-medium text-near-black">
            Students by section
          </h2>
          {stats.bySection.length === 0 ? (
            <p className="mt-4 text-sm text-neutral">No students imported yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-border">
              {stats.bySection.map((row) => (
                <li
                  key={row.section}
                  className="flex items-center justify-between py-2 text-sm"
                >
                  <span className="text-charcoal">Section {row.section}</span>
                  <span className="font-medium text-near-black">{row.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-near-black">Recent imports</h2>
          <Link
            href="/imports"
            className="text-sm text-charcoal underline-offset-2 hover:underline"
          >
            View all
          </Link>
        </div>

        {stats.recentImports.length === 0 ? (
          <EmptyState
            title="No imports yet"
            description="Upload a student CSV to populate the portal."
            action={
              <Link
                href="/import"
                className="rounded border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white"
              >
                Import CSV
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded border border-border bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
                <tr>
                  <th className="px-4 py-3 font-medium">File</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Counts</th>
                  <th className="px-4 py-3 font-medium">Imported</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentImports.map((item) => (
                  <tr key={item.importId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <Link
                        href={`/imports/${item.importId}`}
                        className="font-medium text-near-black underline-offset-2 hover:underline"
                      >
                        {item.filename}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <ImportStatusBadge status={item.status} />
                    </td>
                    <td className="px-4 py-3">
                      <ImportCounts
                        totalRows={item.totalRows}
                        acceptedRows={item.acceptedRows}
                        rejectedRows={item.rejectedRows}
                        skippedRows={item.skippedRows}
                      />
                    </td>
                    <td className="px-4 py-3 text-charcoal">
                      {formatDateTime(item.importedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-white px-4 py-5">
      <p className="text-xs uppercase tracking-wide text-neutral">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-near-black">
        {value}
      </p>
    </div>
  );
}
