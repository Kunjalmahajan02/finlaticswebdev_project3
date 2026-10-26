import prisma from "@/lib/db";
import { embedQuery, embeddingModel } from "@/lib/embedder";
import { searchChunks } from "@/lib/vectorSearch";
import { streamAnswer } from "@/lib/claudeRAG";
import { startSSE } from "@/lib/sse";

export const config = { maxDuration: 60 };

// Steps 6–7: embed the question, find the top 5 chunks, stream an answer with citations
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { docId, question, history } = req.body || {};
  if (typeof docId !== "string" || typeof question !== "string" || !question.trim()) {
    return res.status(400).json({ error: "docId and question are required" });
  }

  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: { title: true, status: true, embeddingModel: true },
  });
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (doc.status !== "ready") return res.status(409).json({ error: "This document is still being processed" });
  // Question and chunks must be embedded by the same model, or similarity scores are meaningless
  if (doc.embeddingModel && doc.embeddingModel !== embeddingModel()) {
    return res.status(409).json({ error: "This document was indexed with a different embedding model. Please upload it again." });
  }

  const send = startSSE(res);
  try {
    const queryEmbedding = await embedQuery(question.slice(0, 2000));
    const sources = await searchChunks(docId, queryEmbedding);

    send(
      "sources",
      sources.map((s, i) => ({
        n: i + 1,
        page: s.page,
        index: s.index,
        similarity: Number(s.similarity),
        content: s.content,
      }))
    );

    for await (const text of streamAnswer({
      question,
      sources,
      title: doc.title,
      history: Array.isArray(history) ? history : [],
    })) {
      send("token", { text });
    }
    send("done", {});
  } catch (err) {
    console.error(err);
    send("error", { error: "Something went wrong while answering. Please try again." });
  }
  res.end();
}
