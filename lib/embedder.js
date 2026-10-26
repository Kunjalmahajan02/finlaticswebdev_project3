// Step 4 of the pipeline: text → 768-dimension vectors with Google's Gemini embeddings (free tier)
export const EMBEDDING_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768; // must match vector(768) in sql/enable-pgvector.sql

const API = "https://generativelanguage.googleapis.com/v1beta/models";
const BATCH_SIZE = 50;

async function callGemini(body) {
  if (!process.env.GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not set");

  // Retry on rate limits, which the free tier hits on large documents
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${API}/${EMBEDDING_MODEL}:batchEmbedContents`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
      body: JSON.stringify(body),
    });

    if (res.ok) return (await res.json()).embeddings.map((e) => e.values);

    if (res.status === 429 && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Gemini embeddings failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }
}

const request = (text) => ({
  model: `models/${EMBEDDING_MODEL}`,
  content: { parts: [{ text }] },
  outputDimensionality: EMBEDDING_DIMENSIONS,
});

// gemini-embedding-2 takes the task as a text prefix instead of a task_type field
export async function embedDocuments(texts, title, onProgress) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const requests = batch.map((t) => request(`title: ${title || "none"} | text: ${t}`));
    vectors.push(...(await callGemini({ requests })));
    onProgress?.(vectors.length, texts.length);
  }
  return vectors;
}

export async function embedQuery(question) {
  const [vector] = await callGemini({ requests: [request(`task: search result | query: ${question}`)] });
  return vector;
}
