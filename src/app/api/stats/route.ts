import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/import/errors";
import { getDashboardStats } from "@/lib/students/student-service";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
