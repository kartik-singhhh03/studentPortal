import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/import/errors";
import {
  listImportBatches,
  processCsvImport,
} from "@/lib/import/import-service";
import { parsePagination } from "@/lib/import/pagination";
import { getMaxUploadBytes, readUploadBytes } from "@/lib/import/upload";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pagination = parsePagination(searchParams);
    const result = await listImportBatches(pagination);
    return NextResponse.json(result);
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}

export async function POST(request: Request) {
  try {
    const maxBytes = getMaxUploadBytes();
    const formData = await request.formData();
    const fileValue = formData.get("file");
    const file = fileValue instanceof File ? fileValue : null;
    const bytes = await readUploadBytes(file, maxBytes);

    const result = await processCsvImport({
      filename: file?.name || "upload.csv",
      bytes,
    });

    return NextResponse.json(result.summary, { status: result.httpStatus });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
