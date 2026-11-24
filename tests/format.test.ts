import { describe, expect, it } from "vitest";
import {
  describeImportCounts,
  formatBytes,
  formatPercent,
  importStatusLabel,
} from "@/lib/format";

describe("format helpers", () => {
  it("keeps skipped rows separate from processed totals", () => {
    expect(
      describeImportCounts({
        totalRows: 25,
        acceptedRows: 16,
        rejectedRows: 9,
        skippedRows: 2,
      }),
    ).toBe("25 processed · 16 accepted · 9 rejected · 2 blank skipped");
  });

  it("omits skipped text when zero", () => {
    expect(
      describeImportCounts({
        totalRows: 1,
        acceptedRows: 1,
        rejectedRows: 0,
        skippedRows: 0,
      }),
    ).toBe("1 processed · 1 accepted · 0 rejected");
  });

  it("formats bytes and percents", () => {
    expect(formatBytes(2048)).toContain("KB");
    expect(formatPercent(91.25)).toBe("91.3%");
    expect(importStatusLabel("SKIPPED_IDENTICAL")).toContain("identical");
  });
});
