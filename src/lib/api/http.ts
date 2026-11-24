export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | T
    | {
        error?: {
          code?: string;
          message?: string;
          details?: Record<string, unknown>;
        };
      }
    | null;

  if (!response.ok) {
    const err = data as {
      error?: {
        code?: string;
        message?: string;
        details?: Record<string, unknown>;
      };
    } | null;
    throw new ApiError(
      response.status,
      err?.error?.code ?? "REQUEST_FAILED",
      err?.error?.message ?? "Request failed.",
      err?.error?.details,
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
