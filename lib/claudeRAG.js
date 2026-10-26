import Anthropic from "@anthropic-ai/sdk";
import Groq from "groq-sdk";

/**
 * Step 7 of the pipeline: answer the question using only the retrieved chunks, streamed token by token.
 *
 * Uses Claude when ANTHROPIC_API_KEY is set. Otherwise it falls back to Groq's free tier
 * (GROQ_API_KEY), so the app still works without a paid key. Both share the same prompt.
 */
const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

export const isClaudeEnabled = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const answerModel = () => (isClaudeEnabled() ? `Claude (${CLAUDE_MODEL})` : `Groq (${GROQ_MODEL})`);

const SYSTEM_PROMPT = `You answer questions about a document using ONLY the numbered context passages provided.
Rules:
- Cite every fact with the passage number in plain ASCII square brackets, exactly like [1] or [2][4]. Never use 【】 or other bracket styles.
- If the passages don't contain the answer, say you couldn't find it in the document. Do not use outside knowledge.
- Be clear and concise. Use short paragraphs or "-" bullet lists. Do not use markdown headings or tables.`;

function buildMessages({ question, sources, history, title }) {
  const context = sources.map((s, i) => `[${i + 1}] (page ${s.page})\n${s.content}`).join("\n\n---\n\n");

  // Keep only well-formed alternating turns from the client, newest last
  const past = history
    .slice(-6)
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
    .map((m) => ({ role: m.role, content: String(m.content).slice(0, 2000) }));
  while (past.length && past[0].role !== "user") past.shift();

  return [
    ...past,
    { role: "user", content: `Document: "${title}"\n\nContext passages:\n\n${context}\n\nQuestion: ${question}` },
  ];
}

let anthropic;
async function* streamClaude(messages) {
  anthropic ??= new Anthropic();

  const stream = anthropic.beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    messages,
    output_config: { effort: "low" }, // short grounded answers don't need deep thinking
    // If a safety classifier declines, the API retries on a suitable fallback model in the same call
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") yield event.delta.text;
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === "refusal") yield "\n\nSorry, I can't answer that question.";
}

let groq;
async function* streamGroq(messages) {
  if (!process.env.GROQ_API_KEY) throw new Error("Set ANTHROPIC_API_KEY or GROQ_API_KEY");
  groq ??= new Groq({ apiKey: process.env.GROQ_API_KEY });

  const stream = await groq.chat.completions.create({
    model: GROQ_MODEL,
    stream: true,
    temperature: 0.2,
    ...(GROQ_MODEL.startsWith("openai/gpt-oss") && { reasoning_effort: "low" }),
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
  });

  for await (const part of stream) {
    const text = part.choices[0]?.delta?.content;
    if (text) yield text;
  }
}

export async function* streamAnswer({ question, sources, history = [], title }) {
  const messages = buildMessages({ question, sources, history, title });
  yield* isClaudeEnabled() ? streamClaude(messages) : streamGroq(messages);
}
