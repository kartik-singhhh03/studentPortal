import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { ImportClientError } from "@/lib/import/errors";
import { formatMark, formatPercent } from "@/lib/format";
import { getStudentById } from "@/lib/students/student-service";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export default async function StudentDetailPage({ params }: RouteContext) {
  const { studentId } = await params;

  let student;
  try {
    student = await getStudentById(studentId);
  } catch (error) {
    const notFound =
      error instanceof ImportClientError && error.code === "NOT_FOUND";
    return (
      <div>
        <PageHeader title="Student report" />
        <ErrorState
          title={notFound ? "Student not found" : "Could not load student"}
          message={
            notFound
              ? `No student exists with ID ${studentId.toUpperCase()}.`
              : "Please try again from the students list."
          }
        />
        <div className="mt-4">
          <Link
            href="/students"
            className="text-sm text-charcoal underline-offset-2 hover:underline"
          >
            Back to students
          </Link>
        </div>
      </div>
    );
  }

  const subjects = [
    { label: "Maths", value: student.maths, key: "maths" },
    { label: "Science", value: student.science, key: "science" },
    { label: "English", value: student.english, key: "english" },
    {
      label: "Social studies",
      value: student.socialStudies,
      key: "socialStudies",
    },
    {
      label: "Second language",
      value: student.secondLanguage,
      key: "secondLanguage",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title={student.fullName}
        description={`${student.studentId} · Grade ${student.gradeLevel}${student.section}`}
        actions={
          <Link
            href="/students"
            className="rounded-[var(--radius-sm)] border border-border bg-white px-3 py-2 text-sm text-near-black transition-colors hover:bg-off-white"
          >
            Back to students
          </Link>
        }
      />

      <section className="surface mb-6 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral">
              Overall result
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <p className="text-3xl font-semibold tracking-tight text-near-black">
                {student.letterGrade}
              </p>
              <Badge tone={student.passed ? "success" : "danger"}>
                {student.passed ? "Pass" : "Fail"}
              </Badge>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:text-right">
            <div>
              <dt className="text-neutral">Total marks</dt>
              <dd className="font-medium text-near-black">
                {formatMark(student.totalMarks)} / 500
              </dd>
            </div>
            <div>
              <dt className="text-neutral">Percentage</dt>
              <dd className="font-medium text-near-black">
                {formatPercent(student.percentage)}
              </dd>
            </div>
          </dl>
        </div>
        {student.failedSubjects.length > 0 ? (
          <p className="mt-4 text-xs text-error">
            Below subject pass mark (35): {student.failedSubjects.join(", ")}
          </p>
        ) : (
          <p className="mt-4 text-xs text-neutral">
            All subjects meet the minimum mark of 35. Pass also requires ≥40%
            overall.
          </p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-5">
          <h2 className="text-sm font-medium text-near-black">
            Student details
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Detail label="Email" value={student.email} />
            <Detail label="Date of birth" value={student.dateOfBirth} />
            <Detail label="Age" value={String(student.age)} />
            <Detail label="Grade" value={String(student.gradeLevel)} />
            <Detail label="Section" value={student.section} />
            <Detail label="Student ID" value={student.studentId} />
          </dl>
        </section>

        <section className="surface p-5">
          <h2 className="text-sm font-medium text-near-black">
            Grading scheme
          </h2>
          <ul className="mt-4 space-y-2 text-sm text-charcoal">
            <li>A ≥ 90% · B ≥ 75% · C ≥ 60% · D ≥ 40% · F &lt; 40%</li>
            <li>Pass: overall ≥ 40% and every subject ≥ 35</li>
            <li>Failing a subject forces Fail even if overall percentage is high</li>
          </ul>
        </section>
      </div>

      <section className="surface mt-4 overflow-hidden">
        <div className="border-b border-border px-5 py-3">
          <h2 className="text-sm font-medium text-near-black">Subject marks</h2>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-off-white text-xs uppercase tracking-wide text-neutral">
            <tr>
              <th className="px-5 py-3 font-medium">Subject</th>
              <th className="px-5 py-3 font-medium">Mark</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const failed = student.failedSubjects.includes(subject.key);
              return (
                <tr
                  key={subject.key}
                  className="table-row-hover border-b border-border last:border-0"
                >
                  <td className="px-5 py-3.5 text-near-black">{subject.label}</td>
                  <td className="px-5 py-3.5 font-medium">
                    {formatMark(subject.value)}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={failed ? "danger" : "success"}>
                      {failed ? "Below 35" : "OK"}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral">{label}</dt>
      <dd className="mt-1 text-sm text-near-black">{value}</dd>
    </div>
  );
}
