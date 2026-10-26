import Groq from "groq-sdk";

// Step 7: answer the question using only the retrieved chunks, streamed token by token
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

let groq;
function getClient() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

const SYSTEM_PROMPT = `You answer questions about a document using ONLY the numbered context passages provided.
Rules:
- Cite every fact with the passage number in square brackets, like [1] or [2][4].
- If the passages don't contain the answer, say you couldn't find it in the document. Do not use outside knowledge.
- Be clear and concise. Use short paragraphs or "-" bullet lists. Do not use markdown headings or tables.`;

export async function* streamAnswer({ question, sources, history = [], title }) {
  const context = sources
    .map((s, i) => `[${i + 1}] (page ${s.page})\n${s.content}`)
    .join("\n\n---\n\n");

  const stream = await getClient().chat.completions.create({
    model: MODEL,
    stream: true,
    temperature: 0.2,
    ...(MODEL.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.slice(-6).map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
      {
        role: "user",
        content: `Document: "${title}"\n\nContext passages:\n\n${context}\n\nQuestion: ${question}`,
      },
    ],
  });

  for await (const part of stream) {
    const text = part.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
