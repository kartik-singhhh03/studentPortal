import { describe, expect, it } from "vitest";
import { ImportClientError } from "@/lib/import/errors";
import { parseStudentListQuery } from "@/lib/students/student-service";

describe("parseStudentListQuery", () => {
  it("parses valid filters", () => {
    const query = parseStudentListQuery(
      new URLSearchParams("q=ada&gradeLevel=8&section=b&page=2&pageSize=10"),
    );
    expect(query).toMatchObject({
      q: "ada",
      gradeLevel: 8,
      section: "B",
      page: 2,
      pageSize: 10,
    });
  });

  it("rejects invalid grade filters", () => {
    expect(() =>
      parseStudentListQuery(new URLSearchParams("gradeLevel=99")),
    ).toThrow(ImportClientError);
  });
});
