import prisma from "@/lib/db";
import { chunkPages } from "@/lib/chunker";
import { embedDocuments, embeddingModel } from "@/lib/embedder";
import { storeChunks } from "@/lib/vectorSearch";

// Keeps one request within the free Gemini quota and Vercel's time limit (~40k tokens)
export const MAX_CHUNKS = 80;

/**
 * Runs steps 3–5 for an uploaded document: chunk → embed → store.
 * onProgress(step, info) reports each stage so the UI can show the pipeline live.
 */
export async function processDocument(documentId, onProgress = () => {}) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw new Error("Document not found");

  // Claim the document atomically so two simultaneous requests can't both process it
  const claimed = await prisma.document.updateMany({
    where: { id: documentId, status: { in: ["uploaded", "failed"] } },
    data: { status: "processing" },
  });
  if (claimed.count === 0) {
    if (doc.status === "ready") return doc;
    throw new Error("Document is already being processed");
  }

  try {
    const { chunks: allChunks, tokenCount } = chunkPages(doc.pages);
    const chunks = allChunks.slice(0, MAX_CHUNKS);
    onProgress("chunked", { chunkCount: chunks.length, tokenCount, truncated: allChunks.length > chunks.length });

    const embeddings = await embedDocuments(
      chunks.map((c) => c.content),
      doc.title,
      (done, total) => onProgress("embedding", { done, total })
    );
    onProgress("embedded", { dimensions: embeddings[0]?.length || 0, model: embeddingModel() });

    await storeChunks(documentId, chunks, embeddings);
    onProgress("stored", { chunkCount: chunks.length });

    return await prisma.document.update({
      where: { id: documentId },
      data: { status: "ready", chunkCount: chunks.length, tokenCount, embeddingModel: embeddingModel() },
    });
  } catch (err) {
    await prisma.document.update({ where: { id: documentId }, data: { status: "failed" } });
    throw err;
  }
}
