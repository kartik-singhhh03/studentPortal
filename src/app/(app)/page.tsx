import Link from "next/link";
import { ImportCounts } from "@/components/imports/import-counts";
import { ImportStatusBadge } from "@/components/imports/import-status-badge";
import { DistributionList } from "@/components/ui/distribution-list";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { formatDateTime, importStatusLabel } from "@/lib/format";
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
        actions={
          <Link
            href="/import"
            className="rounded-[var(--radius-sm)] border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal"
          >
            Import CSV
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total students" value={String(stats.totalStudents)} />
        <StatCard
          label="Grade levels"
          value={String(stats.byGradeLevel.length)}
          hint="Distinct grades present"
        />
        <StatCard
          label="Sections"
          value={String(stats.bySection.length)}
          hint="Distinct sections present"
        />
        <StatCard
          label="Latest import"
          value={
            stats.latestImport
              ? importStatusLabel(stats.latestImport.status)
              : "None"
          }
          hint={
            stats.latestImport
              ? formatDateTime(stats.latestImport.importedAt)
              : "Upload a CSV to begin"
          }
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <DistributionList
          title="Students by grade"
          emptyLabel="No students imported yet."
          items={stats.byGradeLevel.map((row) => ({
            key: String(row.gradeLevel),
            label: `Grade ${row.gradeLevel}`,
            count: row.count,
          }))}
        />
        <DistributionList
          title="Students by section"
          emptyLabel="No students imported yet."
          items={stats.bySection.map((row) => ({
            key: row.section,
            label: `Section ${row.section}`,
            count: row.count,
          }))}
        />
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium text-near-black">Recent imports</h2>
          <Link
            href="/imports"
            className="text-sm text-charcoal underline-offset-2 transition-colors hover:text-near-black hover:underline"
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
                className="rounded-[var(--radius-sm)] border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white"
              >
                Import CSV
              </Link>
            }
          />
        ) : (
          <div className="surface overflow-hidden">
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
                  <tr
                    key={item.importId}
                    className="table-row-hover border-b border-border last:border-0"
                  >
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
