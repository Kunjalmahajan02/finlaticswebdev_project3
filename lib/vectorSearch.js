import { Prisma } from "@prisma/client";
import pgvector from "pgvector";
import prisma from "@/lib/db";

export const TOP_K = 5;

// Serializes a JS array to pgvector's text format, e.g. "[0.1,0.2,...]"
const toVector = (values) => pgvector.toSql(values);

// Step 5: store chunks with their embeddings in pgvector.
// Upserts on (documentId, index), so running twice for the same document never duplicates chunks.
export async function storeChunks(documentId, chunks, embeddings) {
  for (let i = 0; i < chunks.length; i += 50) {
    const rows = chunks.slice(i, i + 50).map((c, j) =>
      Prisma.sql`(${documentId}, ${c.index}, ${c.page}, ${c.content}, ${c.tokenCount}, ${toVector(embeddings[i + j])}::vector)`
    );
    await prisma.$executeRaw`
      INSERT INTO "Chunk" ("documentId", "index", "page", "content", "tokenCount", "embedding")
      VALUES ${Prisma.join(rows)}
      ON CONFLICT ("documentId", "index") DO UPDATE SET
        "page" = EXCLUDED."page",
        "content" = EXCLUDED."content",
        "tokenCount" = EXCLUDED."tokenCount",
        "embedding" = EXCLUDED."embedding"`;
  }
  // Drop leftovers from an earlier, longer version of the same document
  await prisma.chunk.deleteMany({ where: { documentId, index: { gte: chunks.length } } });
}

// Step 6: cosine search. `<=>` is pgvector's cosine distance, so similarity = 1 - distance
export async function searchChunks(documentId, queryEmbedding, k = TOP_K) {
  const vector = toVector(queryEmbedding);
  return prisma.$queryRaw`
    SELECT "index", "page", "content", 1 - ("embedding" <=> ${vector}::vector) AS "similarity"
    FROM "Chunk"
    WHERE "documentId" = ${documentId} AND "embedding" IS NOT NULL
    ORDER BY "embedding" <=> ${vector}::vector
    LIMIT ${k}`;
}
