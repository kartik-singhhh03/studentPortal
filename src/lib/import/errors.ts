export type ImportClientErrorCode =
  | "MISSING_FILE"
  | "INVALID_FILE_TYPE"
  | "EMPTY_FILE"
  | "FILE_TOO_LARGE"
  | "INVALID_CSV"
  | "MISSING_HEADERS"
  | "NOT_FOUND"
  | "INVALID_QUERY"
  | "IMPORT_IN_PROGRESS"
  | "INTERNAL_ERROR";

export class ImportClientError extends Error {
  readonly code: ImportClientErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: ImportClientErrorCode,
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ImportClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toPublicError(error: unknown): {
  status: number;
  body: { error: { code: string; message: string; details?: Record<string, unknown> } };
} {
  if (error instanceof ImportClientError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
    };
  }

  // Log only safe metadata — never dump objects that may contain connection URLs.
  if (error instanceof Error) {
    console.error("[api]", error.name, error.message);
  } else {
    console.error("[api] unexpected non-error throw");
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "An unexpected error occurred while processing the request.",
      },
    },
  };
}
