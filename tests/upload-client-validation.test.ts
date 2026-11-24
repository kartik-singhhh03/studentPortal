import { describe, expect, it } from "vitest";

function validateSelectedFile(
  file: { name: string; size: number } | null,
  maxUploadBytes: number,
): string | null {
  if (!file) return null;
  if (!file.name.toLowerCase().endsWith(".csv")) return "Please choose a .csv file.";
  if (file.size <= 0) return "The selected file is empty.";
  if (file.size > maxUploadBytes) {
    return `File is too large. Maximum size is ${maxUploadBytes} bytes.`;
  }
  return null;
}

describe("client CSV selection validation", () => {
  it("accepts a valid csv", () => {
    expect(
      validateSelectedFile({ name: "students.csv", size: 1200 }, 5000),
    ).toBeNull();
  });

  it("rejects non-csv and oversized files", () => {
    expect(
      validateSelectedFile({ name: "students.txt", size: 10 }, 5000),
    ).toMatch(/csv/i);
    expect(
      validateSelectedFile({ name: "students.csv", size: 9000 }, 5000),
    ).toMatch(/too large/i);
  });
});
