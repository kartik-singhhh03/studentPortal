import { describe, expect, it } from "vitest";
import { parseStudentCsv } from "@/lib/import/csv-parser";
import { ImportClientError } from "@/lib/import/errors";

const HEADER =
  "student_id,full_name,email,date_of_birth,grade_level,section,maths,science,english,social_studies,second_language";

function buf(text: string): Buffer {
  return Buffer.from(text, "utf8");
}

describe("parseStudentCsv", () => {
  it("parses a normal CSV and maps headers case-insensitively", () => {
    const csv = `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rowsRead).toBe(1);
    expect(parsed.rows[0].rowNumber).toBe(2);
    expect(parsed.headerMap.get("student_id")).toBe(0);
  });

  it("supports UTF-8 BOM", () => {
    const csv = `\uFEFF${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rowsRead).toBe(1);
    expect(parsed.headerMap.has("student_id")).toBe(true);
  });

  it("supports CRLF line endings", () => {
    const csv = `${HEADER}\r\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\r\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rowsRead).toBe(1);
    expect(parsed.rows[0].rowNumber).toBe(2);
  });

  it("supports quoted commas and escaped quotes", () => {
    const csv = `${HEADER}\nSTU1,"Patel, ""Sahil""",sahil@example.edu,2012-01-01,8,A,80,81,82,83,84\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rows[0].fields[1]).toBe('Patel, "Sahil"');
  });

  it("supports unicode names", () => {
    const csv = `${HEADER}\nSTU1,Müller Patel,m@example.edu,2012-01-01,8,A,80,81,82,83,84\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rows[0].fields[1]).toBe("Müller Patel");
  });

  it("ignores extra columns and still validates required headers", () => {
    const csv = `${HEADER},parent_phone\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84,999\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.headers).toContain("parent_phone");
    expect(parsed.rows[0].fields).toHaveLength(12);
  });

  it("skips blank and empty-field rows but preserves later line numbers", () => {
    const csv = `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83,84\n\n,,,,,,,,,,\nSTU2,Grace Hopper,grace@example.edu,2012-02-02,7,B,70,71,72,73,74\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.skippedRows).toBe(2);
    expect(parsed.rowsRead).toBe(2);
    expect(parsed.rows[1].rowNumber).toBe(5);
  });

  it("rejects empty files", () => {
    expect(() => parseStudentCsv(buf(""))).toThrow(ImportClientError);
  });

  it("rejects missing required headers", () => {
    expect(() =>
      parseStudentCsv(buf("student_id,full_name\nSTU1,Ada\n")),
    ).toThrow(ImportClientError);
  });

  it("keeps incorrect field-count rows for later rejection", () => {
    const csv = `${HEADER}\nSTU1,Ada Lovelace,ada@example.edu,2012-01-01,8,A,80,81,82,83\n`;
    const parsed = parseStudentCsv(buf(csv));
    expect(parsed.rows[0].fields.length).toBe(10);
    expect(parsed.headers.length).toBe(11);
  });

  it("rejects malformed CSV syntax", () => {
    expect(() => parseStudentCsv(buf(`${HEADER}\n"bad,c`))).toThrow(
      ImportClientError,
    );
  });
});
