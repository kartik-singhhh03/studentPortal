import { NextResponse } from "next/server";
import { toPublicError } from "@/lib/import/errors";
import {
  listStudents,
  parseStudentListQuery,
} from "@/lib/students/student-service";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = parseStudentListQuery(searchParams);
    const result = await listStudents(query);
    return NextResponse.json(result);
  } catch (error) {
    const publicError = toPublicError(error);
    return NextResponse.json(publicError.body, { status: publicError.status });
  }
}
