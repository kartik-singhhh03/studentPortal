import { NextResponse } from "next/server";
import { buildErrorReportCsv } from "@/lib/import/error-report";
import { toPublicError } from "@/lib/import/errors";
import { getAllImportErrorsForReport } from "@/lib/import/import-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ importId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { importId } = await context.params;
    const { batch, errors } = await getAllImportErrorsForReport(importId);

    const csv = buildErrorReportCsv(
      errors.map((error) => ({
        rowNumber: error.rowNumber,
        studentId: error.studentId,
        field: error.field,
        errorCode: error.errorCode,
        message: error.message,
        rejectedValue: error.rejectedValue,
      })),
    );

    const safeName = batch.filename.replace(/[^\w.-]+/g, "_");
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="import-${importId}-errors-${safeName}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
