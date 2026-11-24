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
            className="rounded border border-border bg-white px-3 py-2 text-sm text-near-black hover:bg-off-white"
          >
            Back to students
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded border border-border bg-white p-5">
          <h2 className="text-sm font-medium text-near-black">Details</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Detail label="Email" value={student.email} />
            <Detail label="Date of birth" value={student.dateOfBirth} />
            <Detail label="Age" value={String(student.age)} />
            <Detail label="Grade" value={String(student.gradeLevel)} />
            <Detail label="Section" value={student.section} />
            <Detail
              label="Result"
              value={
                <Badge tone={student.passed ? "success" : "danger"}>
                  {student.passed ? "Pass" : "Fail"} · {student.letterGrade} ·{" "}
                  {formatPercent(student.percentage)}
                </Badge>
              }
            />
          </dl>
        </section>

        <section className="rounded border border-border bg-white p-5">
          <h2 className="text-sm font-medium text-near-black">Overall</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral">Total marks</dt>
              <dd className="font-medium">{formatMark(student.totalMarks)} / 500</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral">Percentage</dt>
              <dd className="font-medium">{formatPercent(student.percentage)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral">Letter grade</dt>
              <dd className="font-medium">{student.letterGrade}</dd>
            </div>
            {student.failedSubjects.length > 0 ? (
              <p className="text-xs text-[#991b1b]">
                Below subject pass mark (35): {student.failedSubjects.join(", ")}
              </p>
            ) : null}
          </dl>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded border border-border bg-white">
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
                <tr key={subject.key} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 text-near-black">{subject.label}</td>
                  <td className="px-5 py-3 font-medium">
                    {formatMark(subject.value)}
                  </td>
                  <td className="px-5 py-3">
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
