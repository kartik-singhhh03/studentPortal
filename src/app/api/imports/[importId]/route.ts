import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/import/errors";
import {
  getImportBatch,
  listImportErrors,
} from "@/lib/import/import-service";
import { parsePagination } from "@/lib/import/pagination";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ importId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { importId } = await context.params;
    const summary = await getImportBatch(importId);

    const { searchParams } = new URL(request.url);
    const includeErrors = searchParams.get("includeErrors") === "true";

    if (!includeErrors) {
      return NextResponse.json({ import: summary });
    }

    const pagination = parsePagination(searchParams);
    const errors = await listImportErrors({
      importId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return NextResponse.json({
      import: summary,
      errors,
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
