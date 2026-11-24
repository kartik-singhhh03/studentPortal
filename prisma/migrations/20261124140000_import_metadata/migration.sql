-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN "skippedRows" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "import_batches" ADD COLUMN "completedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "import_errors" ADD COLUMN "rejectedValue" TEXT;
