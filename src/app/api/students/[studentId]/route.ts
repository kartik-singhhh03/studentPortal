import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/import/errors";
import { getStudentById } from "@/lib/students/student-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ studentId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { studentId } = await context.params;
    const student = await getStudentById(studentId);
    return NextResponse.json({ student });
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
