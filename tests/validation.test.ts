import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "@/lib/import/csv-parser";
import { validateParsedCsv } from "@/lib/import/validation";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

const IMPORT_DATE = new Date("2026-11-24T12:00:00");

function validate(csv: string) {
  return validateParsedCsv(parseStudentCsv(Buffer.from(csv, "utf8")), IMPORT_DATE);
}

describe("validateParsedCsv", () => {
  it("accepts a valid student and normalizes values", () => {
    const [row] = validate(
      `${HEADER}\nstu-01,  Ada   Lovelace ,ADA@EXAMPLE.EDU,10/02/2012,09,b,80.5,81,82,83,84\n`,
    );
    expect(row.errors).toHaveLength(0);
    expect(row.accepted).toMatchObject({
      studentId: "STU-01",
      fullName: "Ada Lovelace",
      email: "ada@example.edu",
      gradeLevel: 9,
      section: "B",
      maths: 80.5,
    });
  });

  it("reports missing required values", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
    );
    expect(row.errors.some((e) => e.code === "MISSING_REQUIRED")).toBe(true);
  });

  it("reports invalid email", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,Ada,sana@example,2012-01-01,8,A,80,81,82,83,84\n`,
    );
    expect(row.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "email", code: "INVALID_FORMAT" }),
      ]),
    );
  });

  it("reports invalid age", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,Ada,ada@example.edu,1970-01-01,8,A,80,81,82,83,84\n`,
    );
    expect(row.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "date_of_birth",
          code: "OUT_OF_RANGE",
        }),
      ]),
    );
  });

  it("reports invalid marks, section and grade", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,Ada,ada@example.edu,2012-01-01,IX,Z,-5,81,82,83,84\n`,
    );
    const codes = row.errors.map((e) => `${e.field}:${e.code}`);
    expect(codes).toEqual(
      expect.arrayContaining([
        "grade_level:INVALID_FORMAT",
        "section:INVALID_FORMAT",
        "maths:OUT_OF_RANGE",
      ]),
    );
  });

  it("reports multiple validation errors in one row", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,,not-an-email,2012-01-01,8,Z,80,81,82,83,84\n`,
    );
    expect(row.errors.length).toBeGreaterThanOrEqual(3);
  });

  it("rejects wrong field count without fake missing-field errors", () => {
    const [row] = validate(
      `${HEADER}\nSTU1,Ada,ada@example.edu,2012-01-01,8,A,80,81,82,83\n`,
    );
    expect(row.errors).toHaveLength(1);
    expect(row.errors[0].code).toBe("WRONG_FIELD_COUNT");
  });

  it("marks later duplicate IDs even when first row is invalid", () => {
    const rows = validate(
      `${HEADER}\nSTU5,Ada,ada@example.edu,2012-01-01,8,A,-1,81,82,83,84\nSTU5,Bob,bob@example.edu,2012-01-01,8,A,80,81,82,83,84\n`,
    );
    expect(rows[0].errors.some((e) => e.code === "OUT_OF_RANGE")).toBe(true);
    expect(rows[1].errors.some((e) => e.code === "DUPLICATE_ID")).toBe(true);
    expect(rows[1].accepted).toBeNull();
  });
});
