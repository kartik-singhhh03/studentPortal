import { describe, expect, it } from "vitest";
import { gradeStudent, letterGradeFromPercentage } from "../src/lib/grading";

describe("grading", () => {
  it("assigns letter bands from percentage", () => {
    expect(letterGradeFromPercentage(90)).toBe("A");
    expect(letterGradeFromPercentage(89.9)).toBe("B");
    expect(letterGradeFromPercentage(75)).toBe("B");
    expect(letterGradeFromPercentage(74.9)).toBe("C");
    expect(letterGradeFromPercentage(60)).toBe("C");
    expect(letterGradeFromPercentage(59.9)).toBe("D");
    expect(letterGradeFromPercentage(40)).toBe("D");
    expect(letterGradeFromPercentage(39.9)).toBe("F");
  });

  it("requires overall 40% and at least 35 in every subject to pass", () => {
    const passing = gradeStudent({
      maths: 40,
      science: 40,
      english: 40,
      socialStudies: 40,
      secondLanguage: 40,
    });
    expect(passing.percentage).toBe(40);
    expect(passing.passed).toBe(true);
    expect(passing.letterGrade).toBe("D");

    const weakSubject = gradeStudent({
      maths: 100,
      science: 100,
      english: 100,
      socialStudies: 100,
      secondLanguage: 34,
    });
    expect(weakSubject.percentage).toBeGreaterThan(40);
    expect(weakSubject.passed).toBe(false);
    expect(weakSubject.failedSubjects).toEqual(["secondLanguage"]);
  });
});
