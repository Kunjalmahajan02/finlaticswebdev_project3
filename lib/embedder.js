import OpenAI from "openai";

/**
 * Step 4 of the pipeline: text → 768-dimension vectors.
 *
 * Uses OpenAI text-embedding-3-small when OPENAI_API_KEY is set. Otherwise it uses
 * Google's free gemini-embedding-2 (GEMINI_API_KEY). Both are asked for 768 dimensions
 * so they fit the same vector(768) column, but their vector spaces differ, so each
 * document records which model embedded it (Document.embeddingModel).
 */
export const EMBEDDING_DIMENSIONS = 768; // must match vector(768) in sql/enable-pgvector.sql

const OPENAI_MODEL = process.env.OPENAI_EMBED_MODEL || "text-embedding-3-small";
const GEMINI_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-2";

const useOpenAI = () => Boolean(process.env.OPENAI_API_KEY);
export const embeddingModel = () => (useOpenAI() ? `openai:${OPENAI_MODEL}` : `gemini:${GEMINI_MODEL}`);

const BATCH_SIZE = 50;

// ---------- OpenAI ----------
let openai;
async function embedOpenAI(texts) {
  openai ??= new OpenAI();
  const res = await openai.embeddings.create({ model: OPENAI_MODEL, input: texts, dimensions: EMBEDDING_DIMENSIONS });
  return res.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

// ---------- Gemini (free tier) ----------
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";

async function embedGemini(texts) {
  if (!process.env.GEMINI_API_KEY) throw new Error("Set OPENAI_API_KEY or GEMINI_API_KEY");

  const body = {
    requests: texts.map((text) => ({
      model: `models/${GEMINI_MODEL}`,
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    })),
  };

  // Retry on rate limits, which the free tier hits on large documents
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${GEMINI_API}/${GEMINI_MODEL}:batchEmbedContents`, {
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

const embedBatch = (texts) => (useOpenAI() ? embedOpenAI(texts) : embedGemini(texts));

// gemini-embedding-2 takes the task as a text prefix; OpenAI embeds the raw text
export async function embedDocuments(texts, title, onProgress) {
  const vectors = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const inputs = useOpenAI() ? batch : batch.map((t) => `title: ${title || "none"} | text: ${t}`);
    vectors.push(...(await embedBatch(inputs)));
    onProgress?.(vectors.length, texts.length);
  }
  return vectors;
}

export async function embedQuery(question) {
  const [vector] = await embedBatch([useOpenAI() ? question : `task: search result | query: ${question}`]);
  return vector;
}
