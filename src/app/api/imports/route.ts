import { NextResponse } from "next/server";
import { ImportClientError, toPublicError } from "@/lib/import/errors";
import {
  listImportBatches,
  processCsvImport,
} from "@/lib/import/import-service";
import { parsePagination } from "@/lib/import/pagination";
import { getMaxUploadBytes, readUploadBytes } from "@/lib/import/upload";

export const runtime = "nodejs";

/** Large CSV imports need headroom on Vercel Pro; Hobby may still time out at 5k rows. */
export const maxDuration = 60;

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
    // Reject oversized bodies early when Content-Length is present (multipart overhead buffer).
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader) {
      const contentLength = Number(contentLengthHeader);
      const multipartOverhead = 64 * 1024;
      if (
        Number.isFinite(contentLength) &&
        contentLength > maxBytes + multipartOverhead
      ) {
        throw new ImportClientError(
          "FILE_TOO_LARGE",
          `File exceeds the maximum upload size of ${maxBytes} bytes.`,
          413,
          { maxBytes, size: contentLength },
        );
      }
    }

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
