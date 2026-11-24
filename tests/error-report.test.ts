import { describe, expect, it } from "vitest";
import {
  buildErrorReportCsv,
  escapeCsvField,
  sanitizeCsvCell,
} from "@/lib/import/error-report";

describe("error report CSV", () => {
  it("escapes commas and quotes", () => {
    expect(escapeCsvField('Patel, "Sahil"')).toBe('"Patel, ""Sahil"""');
  });

  it("neutralizes formula injection", () => {
    expect(sanitizeCsvCell("=CMD()")).toBe("'=CMD()");
    expect(sanitizeCsvCell("+1+1")).toBe("'+1+1");
    expect(sanitizeCsvCell("-1+1")).toBe("'-1+1");
    expect(sanitizeCsvCell("@sum")).toBe("'@sum");
  });

  it("builds a valid CSV report", () => {
    const csv = buildErrorReportCsv([
      {
        rowNumber: 4,
        studentId: "STU1",
        field: "email",
        errorCode: "INVALID_FORMAT",
        message: "bad",
        rejectedValue: "=1+1",
      },
    ]);
    expect(csv.split("\r\n")[0]).toContain("row_number");
    expect(csv).toContain("'=1+1");
  });
});
