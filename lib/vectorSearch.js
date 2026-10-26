import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";

export const TOP_K = 5;

const toVector = (values) => `[${values.join(",")}]`;

// Step 5: store chunks with their embeddings in pgvector
export async function storeChunks(documentId, chunks, embeddings) {
  await prisma.chunk.deleteMany({ where: { documentId } });

  for (let i = 0; i < chunks.length; i += 50) {
    const rows = chunks.slice(i, i + 50).map((c, j) =>
      Prisma.sql`(${documentId}, ${c.index}, ${c.page}, ${c.content}, ${c.tokenCount}, ${toVector(embeddings[i + j])}::vector)`
    );
    await prisma.$executeRaw`
      INSERT INTO "Chunk" ("documentId", "index", "page", "content", "tokenCount", "embedding")
      VALUES ${Prisma.join(rows)}`;
  }
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
