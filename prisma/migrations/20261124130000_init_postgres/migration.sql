-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('COMPLETED', 'FAILED', 'SKIPPED_IDENTICAL');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "gradeLevel" INTEGER NOT NULL,
    "section" TEXT NOT NULL,
    "maths" DOUBLE PRECISION NOT NULL,
    "science" DOUBLE PRECISION NOT NULL,
    "english" DOUBLE PRECISION NOT NULL,
    "socialStudies" DOUBLE PRECISION NOT NULL,
    "secondLanguage" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "importedRows" INTEGER NOT NULL,
    "rejectedRows" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_errors" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "studentId" TEXT,
    "field" TEXT,
    "errorCode" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "import_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_studentId_key" ON "students"("studentId");

-- CreateIndex
CREATE INDEX "students_fullName_idx" ON "students"("fullName");

-- CreateIndex
CREATE INDEX "students_gradeLevel_idx" ON "students"("gradeLevel");

-- CreateIndex
CREATE INDEX "students_section_idx" ON "students"("section");

-- CreateIndex
CREATE INDEX "students_gradeLevel_section_idx" ON "students"("gradeLevel", "section");

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_fileHash_key" ON "import_batches"("fileHash");

-- CreateIndex
CREATE INDEX "import_batches_importedAt_idx" ON "import_batches"("importedAt");

-- CreateIndex
CREATE INDEX "import_errors_importBatchId_idx" ON "import_errors"("importBatchId");

-- CreateIndex
CREATE INDEX "import_errors_importBatchId_rowNumber_idx" ON "import_errors"("importBatchId", "rowNumber");

-- AddForeignKey
ALTER TABLE "import_errors" ADD CONSTRAINT "import_errors_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
