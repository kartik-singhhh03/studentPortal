# Phase 3 — Business-rule findings

## A. Duplicate student IDs within one CSV

**Decision:** Keep Phase 2 behaviour. The first occurrence of a normalized `student_id` wins, even if that row fails other validations. Later rows with the same ID are rejected as `DUPLICATE_ID`.

**Evidence:**

1. Assignment sample pack `sample-data/README.md`: “The first row with a given ID is the original. Later rows with the same ID in the file are rejected as duplicates.”
2. `docs/DATA_CONTRACT.md` (Duplicate ID tracking): first occurrence is original even if invalid.
3. Sample acceptance target for `students_small.csv` depends on this (e.g. first `STU00005` invalid marks, second occurrence duplicate).

The earlier Phase 3 brief line about “invalid first occurrence should not block a later valid occurrence” conflicts with the assignment. **Backend is not changed.**

## B. Import row counts and skipped rows

**Semantics from the backend / data contract:**

| Field | Meaning |
|---|---|
| `totalRows` | Rows **read** — non-blank, non-empty data rows |
| `acceptedRows` | Valid rows persisted (create/update) |
| `rejectedRows` | Data rows that failed validation |
| `skippedRows` | Blank lines / all-empty-field rows — **not** counted in `totalRows` |

Therefore:

- `totalRows === acceptedRows + rejectedRows`
- `skippedRows` is a **separate** category
- Skipped rows are **never** included in accepted rows

Example (`students_small.csv`): total 25, accepted 16, rejected 9, skipped 2.

**UI rule:** Show skipped separately (e.g. “2 blank rows skipped”) and never imply `25 = 16 + 9 + 2` as a single processed total that mixes categories incorrectly. Prefer: “25 rows processed · 16 accepted · 9 rejected” plus “2 blank rows skipped”.
