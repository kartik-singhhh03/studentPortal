import { describe, expect, it } from "vitest";
import { ImportClientError } from "@/lib/import/errors";
import { parsePagination } from "@/lib/import/pagination";

describe("parsePagination", () => {
  it("defaults page and pageSize", () => {
    expect(parsePagination(new URLSearchParams())).toEqual({
      page: 1,
      pageSize: 20,
    });
  });

  it("accepts valid bounds", () => {
    expect(
      parsePagination(new URLSearchParams("page=3&pageSize=50")),
    ).toEqual({ page: 3, pageSize: 50 });
  });

  it("rejects pageSize above 100", () => {
    expect(() =>
      parsePagination(new URLSearchParams("pageSize=500")),
    ).toThrow(ImportClientError);
  });

  it("rejects page below 1", () => {
    expect(() => parsePagination(new URLSearchParams("page=0"))).toThrow(
      ImportClientError,
    );
  });
});
