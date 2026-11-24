# Data Contract — Es Magico Student Results Portal

This document is the source of truth for CSV import validation, grading, and persistence behaviour. Implementation must follow these rules for any CSV in this format, including unseen files. Sample-file totals are acceptance targets only and must never be hardcoded.

## Required CSV columns

| Column | Required | Rules | Normalized storage |
|---|---|---|---|
| `student_id` | Yes | 3–20 characters; letters, digits, hyphen only; case-insensitive | Uppercase |
| `full_name` | Yes | Trim; collapse repeated spaces; length 2–100 after trim; Unicode letters, apostrophes, commas allowed | Trimmed / collapsed |
| `email` | Yes | Valid email format | Lowercase |
| `date_of_birth` | Yes | `YYYY-MM-DD` or `DD/MM/YYYY`; real calendar date; age 5–25 inclusive on import date | ISO date |
| `grade_level` | Yes | Whole number 1–12; leading zeros allowed (`9`, `09`) | Integer 1–12 |
| `section` | Yes | Letter A–F only; case-insensitive | Uppercase |
| `maths` | Yes | Number 0–100 inclusive; decimals allowed | Float |
| `science` | Yes | Number 0–100 inclusive; decimals allowed | Float |
| `english` | Yes | Number 0–100 inclusive; decimals allowed | Float |
| `social_studies` | Yes | Number 0–100 inclusive; decimals allowed | Float |
| `second_language` | Yes | Number 0–100 inclusive; decimals allowed | Float |

Extra columns (for example `parent_phone`) are ignored.

## File-level rules

- Header order does not matter.
- Header matching is case-insensitive; surrounding header whitespace is trimmed.
- All required headers must exist; otherwise the file is rejected with a clear file-level error.
- UTF-8 with or without BOM.
- Windows (`CRLF`) and Unix (`LF`) line endings.
- Quoted fields may contain commas.
- Blank lines are skipped (not errors, not counted as rows read).
- Rows where every field is empty are skipped the same way.
- Blank / empty-field lines still consume physical line numbers.
- Physical line numbers start at 1 for the header row.
- A row with the wrong field count is rejected as a whole with `WRONG_FIELD_COUNT` only (no fake missing-field errors for that structural problem).

## Error codes

| Code | Meaning |
|---|---|
| `MISSING_REQUIRED` | Required field absent or blank after trim |
| `INVALID_FORMAT` | Value present but not in an accepted format |
| `OUT_OF_RANGE` | Parseable value outside the allowed range (marks, age, grade, name length) |
| `DUPLICATE_ID` | Student ID already seen earlier in the same file |
| `WRONG_FIELD_COUNT` | Parsed field count does not match the header field count |

When several independent field validations fail on one row, report each field-specific error.

## Duplicate ID tracking

- The first occurrence of a normalized student ID in a file is the original, even if that row fails other validations.
- Later rows with the same normalized ID are rejected as `DUPLICATE_ID`.
- This follows the assignment wording (“first row with a given ID”), not a “first valid row wins” rule.
- Across different files, a valid row upserts the existing student by normalized `student_id`.
- Identical file re-upload (same SHA-256 content hash) is idempotent: do not reprocess; return `SKIPPED_IDENTICAL` with the original import batch id.

## Rows read vs accepted vs rejected

- **Rows read**: non-blank data rows that are not entirely empty.
- **Accepted**: rows that pass all validations and are persisted (create or update).
- **Rejected**: rows that fail one or more validations (including wrong field count).

## Grading rules

Calculated only in `src/lib/grading.ts`.

- Five subjects; maximum total **500**.
- `percentage = (totalMarks / 500) * 100`.
- Letter bands:
  - **A**: 90–100
  - **B**: 75 to below 90
  - **C**: 60 to below 75
  - **D**: 40 to below 60
  - **F**: below 40
- Pass requires:
  - overall percentage ≥ 40, and
  - every subject mark ≥ 35.

## Persistence decisions

- Do not store uploaded CSV files permanently.
- Store import batch metadata, SHA-256 hash, counts, status, and per-row error records only.
- Neon PostgreSQL via Prisma (`@prisma/adapter-neon`); pooled URL at runtime, direct URL for migrations.

## Sample pack acceptance targets

Observed against the supplied sample pack using import date **2026-11-24** and the rules above:

| File | Rows read | Accepted | Rejected |
|---|---|---|---|
| `students_small.csv` | 25 | 16 | 9 |
| `students_sample.csv` | 5000 | 4685 | 315 |

These numbers validate the rules; they are not configuration.
