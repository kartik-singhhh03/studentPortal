/**
 * Single source of truth for percentage, letter grade, and pass/fail.
 * Total maximum across five subjects is 500.
 */

export type LetterGrade = "A" | "B" | "C" | "D" | "F";

export interface SubjectMarks {
  maths: number;
  science: number;
  english: number;
  socialStudies: number;
  secondLanguage: number;
}

export interface GradingResult {
  totalMarks: number;
  percentage: number;
  letterGrade: LetterGrade;
  passed: boolean;
  failedSubjects: Array<keyof SubjectMarks>;
}

const SUBJECT_PASS_MARK = 35;
const OVERALL_PASS_PERCENTAGE = 40;
const MAX_TOTAL_MARKS = 500;

export function calculateTotalMarks(marks: SubjectMarks): number {
  return (
    marks.maths +
    marks.science +
    marks.english +
    marks.socialStudies +
    marks.secondLanguage
  );
}

export function calculatePercentage(totalMarks: number): number {
  return (totalMarks / MAX_TOTAL_MARKS) * 100;
}

export function letterGradeFromPercentage(percentage: number): LetterGrade {
  if (percentage >= 90) return "A";
  if (percentage >= 75) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

export function findFailedSubjects(marks: SubjectMarks): Array<keyof SubjectMarks> {
  const entries: Array<[keyof SubjectMarks, number]> = [
    ["maths", marks.maths],
    ["science", marks.science],
    ["english", marks.english],
    ["socialStudies", marks.socialStudies],
    ["secondLanguage", marks.secondLanguage],
  ];

  return entries
    .filter(([, value]) => value < SUBJECT_PASS_MARK)
    .map(([subject]) => subject);
}

export function gradeStudent(marks: SubjectMarks): GradingResult {
  const totalMarks = calculateTotalMarks(marks);
  const percentage = calculatePercentage(totalMarks);
  const letterGrade = letterGradeFromPercentage(percentage);
  const failedSubjects = findFailedSubjects(marks);
  const passed =
    percentage >= OVERALL_PASS_PERCENTAGE && failedSubjects.length === 0;

  return {
    totalMarks,
    percentage,
    letterGrade,
    passed,
    failedSubjects,
  };
}
