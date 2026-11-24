import { describe, expect, it } from "vitest";
import { ImportClientError } from "@/lib/import/errors";
import { assertCsvUpload, getMaxUploadBytes } from "@/lib/import/upload";

function fakeFile(name: string, size: number, type = "text/csv"): File {
  const content = "x".repeat(Math.max(size, 1));
  const file = new File([content], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("upload guards", () => {
  it("requires a file", () => {
    expect(() => assertCsvUpload(null, 1000)).toThrow(ImportClientError);
  });

  it("rejects non-csv extensions", () => {
    expect(() => assertCsvUpload(fakeFile("data.txt", 10), 1000)).toThrow(
      ImportClientError,
    );
  });

  it("rejects empty files", () => {
    expect(() => assertCsvUpload(fakeFile("data.csv", 0), 1000)).toThrow(
      ImportClientError,
    );
  });

  it("rejects oversized files", () => {
    expect(() => assertCsvUpload(fakeFile("data.csv", 2000), 1000)).toThrow(
      ImportClientError,
    );
  });

  it("reads max upload bytes from env with fallback", () => {
    const previous = process.env.MAX_UPLOAD_BYTES;
    process.env.MAX_UPLOAD_BYTES = "1024";
    expect(getMaxUploadBytes()).toBe(1024);
    process.env.MAX_UPLOAD_BYTES = previous;
  });
});
