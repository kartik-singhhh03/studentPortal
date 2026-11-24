-- Add PROCESSING in its own migration transaction so PostgreSQL allows
-- subsequent use of the new enum value.
ALTER TYPE "ImportStatus" ADD VALUE IF NOT EXISTS 'PROCESSING';
