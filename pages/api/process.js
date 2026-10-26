import { processDocument } from "@/lib/pipeline";
import { startSSE } from "@/lib/sse";

export const config = { maxDuration: 60 };

// Steps 3–5: chunk, embed and store, streaming progress to the browser over SSE
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { docId } = req.body || {};
  if (typeof docId !== "string") return res.status(400).json({ error: "docId is required" });

  const send = startSSE(res);
  try {
    const doc = await processDocument(docId, send);
    send("done", { id: doc.id, chunkCount: doc.chunkCount, tokenCount: doc.tokenCount });
  } catch (err) {
    console.error(err);
    send("error", { error: err.message === "Document not found" ? err.message : "Processing failed. Please try again." });
  }
  res.end();
}
