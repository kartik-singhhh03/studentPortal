import { z } from "zod";
import { ImportClientError } from "@/lib/import/errors";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export function parsePagination(
  searchParams: URLSearchParams,
): { page: number; pageSize: number } {
  const parsed = paginationSchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    throw new ImportClientError(
      "INVALID_QUERY",
      "Invalid pagination parameters. Use page >= 1 and pageSize between 1 and 100.",
      400,
    );
  }

  return parsed.data;
}
