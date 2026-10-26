import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import prisma from "@/lib/db";
import { ensureSample } from "@/lib/sampleDoc";
import { SAMPLE_ID, SAMPLE_QUESTIONS } from "@/lib/sampleIds";
import { readSSE } from "@/lib/sse";
import ChatMessage from "@/components/ChatMessage";

const GENERIC_QUESTIONS = ["Summarize this document", "What are the key points?", "What conclusions does it reach?"];

export async function getServerSideProps({ params }) {
  if (params.docId === SAMPLE_ID) await ensureSample();

  const doc = await prisma.document.findUnique({
    where: { id: params.docId },
    select: { id: true, title: true, fileName: true, pageCount: true, chunkCount: true, tokenCount: true, status: true, isSample: true },
  });
  if (!doc) return { notFound: true };
  return { props: { doc } };
}

export default function ChatPage({ doc }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const updateLast = (patch) =>
    setMessages((msgs) => {
      const copy = [...msgs];
      const last = copy[copy.length - 1];
      copy[copy.length - 1] = { ...last, ...(typeof patch === "function" ? patch(last) : patch) };
      return copy;
    });

  async function ask(question) {
    question = question.trim();
    if (!question || busy) return;

    const history = messages.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content }));
    setMessages((msgs) => [
      ...msgs,
      { role: "user", content: question },
      { role: "assistant", content: "", streaming: true },
    ]);
    setInput("");
    setBusy(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: doc.id, question, history }),
      });
      if (!res.ok) throw new Error((await res.json()).error);

      await readSSE(res, (event, data) => {
        if (event === "sources") updateLast({ sources: data });
        else if (event === "token") updateLast((m) => ({ content: m.content + data.text }));
        else if (event === "error") updateLast({ error: data.error });
      });
    } catch (err) {
      updateLast({ error: err.message || "Something went wrong." });
    } finally {
      updateLast({ streaming: false });
      setBusy(false);
    }
  }

  const suggestions = doc.isSample ? SAMPLE_QUESTIONS : GENERIC_QUESTIONS;

  return (
    <div className="flex flex-col min-h-[calc(100vh-12rem)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mb-1">
          <Link href="/documents" className="hover:text-white">
            ← Documents
          </Link>
          {doc.isSample && <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">Sample</span>}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold break-words">{doc.title}</h1>
        <p className="text-sm text-slate-400 mt-1">
          {doc.pageCount} pages · {doc.chunkCount} chunks of ≤500 tokens · answers use the top 5 chunks
        </p>
      </div>

      {doc.status !== "ready" ? (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-amber-200">
          {doc.status === "failed"
            ? "Processing this document failed. Please upload it again."
            : "This document is still being processed. Refresh in a few seconds."}
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-5">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-slate-400 mb-4">Ask anything about this document, or try one of these:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => ask(q)}
                      className="px-4 py-2 rounded-full border border-slate-700 text-sm hover:border-indigo-400 hover:text-indigo-300"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <ChatMessage key={i} message={m} />
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="sticky bottom-0 mt-6 pt-3 pb-2 bg-slate-950 flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about this document..."
              maxLength={1000}
              className="flex-1 min-w-0 rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 focus:outline-none focus:border-indigo-400"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-5 rounded-xl"
            >
              {busy ? "..." : "Ask"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
