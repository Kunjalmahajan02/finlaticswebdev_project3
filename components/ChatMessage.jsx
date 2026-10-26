import { useState } from "react";
import ChunkSourceList from "@/components/ChunkSourceList";

// Turns "[2]" citation markers into buttons that open that source below the answer.
// Some models write fullwidth brackets like "【2】", so both forms are accepted.
function renderWithCitations(text, onCite) {
  return text.split(/(\[\d+\]|【\d+(?:†[^】]*)?】)/g).map((part, i) => {
    const match = part.match(/^(?:\[(\d+)\]|【(\d+)(?:†[^】]*)?】)$/);
    if (!match) return <span key={i}>{part.replace(/\*\*/g, "")}</span>;
    const n = Number(match[1] || match[2]);
    return (
      <button
        key={i}
        onClick={() => onCite(n)}
        className="mx-0.5 px-1.5 rounded bg-indigo-500/20 text-indigo-300 text-xs font-semibold align-text-top hover:bg-indigo-500/40"
        title={`Show source ${n}`}
      >
        {n}
      </button>
    );
  });
}

export default function ChatMessage({ message }) {
  const [openSource, setOpenSource] = useState(null);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-600 px-4 py-3 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">🤖</div>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm border border-slate-800 bg-slate-900 px-4 py-3">
        {message.error ? (
          <p className="text-red-400">{message.error}</p>
        ) : message.content ? (
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {renderWithCitations(message.content, setOpenSource)}
            {message.streaming && <span className="inline-block w-2 h-4 ml-0.5 bg-indigo-400 animate-pulse align-middle" />}
          </div>
        ) : (
          <p className="text-slate-400 animate-pulse">{message.sources ? "Writing answer..." : "Searching the document..."}</p>
        )}
        <ChunkSourceList sources={message.sources} openSource={openSource} onToggle={setOpenSource} />
      </div>
    </div>
  );
}
