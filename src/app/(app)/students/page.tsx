import Link from "next/link";
import { Suspense } from "react";
import { Pagination } from "@/components/students/pagination";
import { StudentsToolbar } from "@/components/students/students-toolbar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent } from "@/lib/format";
import {
  listStudents,
  parseStudentListQuery,
} from "@/lib/students/student-service";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function StudentsPage({
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
    const query = parseStudentListQuery(params);
    result = await listStudents(query);
  } catch {
    return (
      <div>
        <PageHeader
          title="Students"
          description="Search and browse imported student records."
        />
        <ErrorState message="Could not load students. Check your filters and try again." />
      </div>
    );
  }

  const q = params.get("q") ?? "";
  const gradeLevel = params.get("gradeLevel") ?? "";
  const section = params.get("section") ?? "";
  const hasFilters = Boolean(q || gradeLevel || section);

  return (
    <div>
      <PageHeader
        title="Students"
        description={`${result.total.toLocaleString()} student${result.total === 1 ? "" : "s"} in the portal.`}
      />

      <Suspense fallback={<Skeleton className="mb-6 h-28 w-full" />}>
        <StudentsToolbar
          initialQ={q}
          initialGradeLevel={gradeLevel}
          initialSection={section}
          total={result.total}
        />
      </Suspense>

      {result.total === 0 ? (
        <EmptyState
          title={hasFilters ? "No matching students" : "No students found"}
          description={
            hasFilters
              ? "Try clearing filters, or adjust the search terms."
              : "Import a CSV to add students."
          }
          action={
            <Link
              href={hasFilters ? "/students" : "/import"}
              className="rounded-[var(--radius-sm)] border border-near-black bg-near-black px-3 py-2 text-sm font-medium text-white"
            >
              {hasFilters ? "Clear filters" : "Import CSV"}
            </Link>
          }
        />
      ) : (
        <>
          <div className="surface overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
                <tr>
                  <th className="px-4 py-3 font-medium">Student ID</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Grade</th>
                  <th className="px-4 py-3 font-medium">Section</th>
                  <th className="px-4 py-3 font-medium">Result</th>
                  <th className="px-4 py-3 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((student) => (
                  <tr
                    key={student.studentId}
                    className="table-row-hover border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs text-charcoal">
                      {student.studentId}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-near-black">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-neutral">{student.email}</div>
                    </td>
                    <td className="px-4 py-3.5 text-charcoal">
                      {student.gradeLevel}
                    </td>
                    <td className="px-4 py-3.5 text-charcoal">{student.section}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{student.letterGrade}</span>
                        <span className="text-neutral">
                          {formatPercent(student.percentage)}
                        </span>
                        <Badge tone={student.passed ? "success" : "danger"}>
                          {student.passed ? "Pass" : "Fail"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/students/${encodeURIComponent(student.studentId)}`}
                        className="text-sm font-medium text-near-black underline-offset-2 hover:underline"
                      >
                        Report
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            basePath="/students"
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            searchParams={{
              q: q || undefined,
              gradeLevel: gradeLevel || undefined,
              section: section || undefined,
            }}
          />
        </>
      )}
    </div>
  );
}
