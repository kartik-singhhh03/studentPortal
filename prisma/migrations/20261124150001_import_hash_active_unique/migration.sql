-- Multiple FAILED rows may share a fileHash. At most one PROCESSING/COMPLETED/
-- SKIPPED_IDENTICAL row may exist per hash (active/successful idempotency).

DROP INDEX IF EXISTS "import_batches_fileHash_key";

CREATE INDEX IF NOT EXISTS "import_batches_fileHash_idx" ON "import_batches"("fileHash");

CREATE UNIQUE INDEX IF NOT EXISTS "import_batches_fileHash_active_key"
ON "import_batches"("fileHash")
WHERE "status" IN ('PROCESSING', 'COMPLETED', 'SKIPPED_IDENTICAL');
