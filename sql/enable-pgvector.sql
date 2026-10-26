-- Run by scripts/setup-db.js on every build. Only creates what's missing and never drops,
-- so it is safe to share one Supabase database with other projects.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "Document" (
  "id"         TEXT PRIMARY KEY,
  "title"      TEXT NOT NULL,
  "fileName"   TEXT NOT NULL,
  "pages"      JSONB NOT NULL DEFAULT '[]',
  "pageCount"  INTEGER NOT NULL DEFAULT 0,
  "tokenCount" INTEGER NOT NULL DEFAULT 0,
  "chunkCount" INTEGER NOT NULL DEFAULT 0,
  "status"     TEXT NOT NULL DEFAULT 'uploaded',
  "isSample"   BOOLEAN NOT NULL DEFAULT false,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 768 dimensions = gemini-embedding-2 with output_dimensionality 768
CREATE TABLE IF NOT EXISTS "Chunk" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "documentId" TEXT NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "index"      INTEGER NOT NULL,
  "page"       INTEGER NOT NULL DEFAULT 1,
  "content"    TEXT NOT NULL,
  "tokenCount" INTEGER NOT NULL,
  "embedding"  vector(768)
);

CREATE INDEX IF NOT EXISTS "Chunk_documentId_idx" ON "Chunk"("documentId");
