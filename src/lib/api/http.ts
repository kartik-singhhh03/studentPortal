export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | T
    | { error?: { code?: string; message?: string } }
    | null;

  if (!response.ok) {
    const err = data as { error?: { code?: string; message?: string } } | null;
    throw new ApiError(
      response.status,
      err?.error?.code ?? "REQUEST_FAILED",
      err?.error?.message ?? "Request failed.",
    );
  }

  return data as T;
}

export function absoluteUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000";
  return new URL(path, base).toString();
}
