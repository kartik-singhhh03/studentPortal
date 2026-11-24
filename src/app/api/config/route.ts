import { NextResponse } from "next/server";
import { getMaxUploadBytes } from "@/lib/import/upload";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    maxUploadBytes: getMaxUploadBytes(),
  });
}
