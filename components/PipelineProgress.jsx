// The 7 RAG pipeline steps. Shown live while a PDF is processed, and statically on the home page.
export const STEPS = [
  { key: "uploaded", label: "PDF uploaded", detail: "User uploads" },
  { key: "extracted", label: "Text extracted", detail: "pdf-parse" },
  { key: "chunked", label: "Chunked", detail: "500 tokens · 50 overlap" },
  { key: "embedded", label: "Embedded", detail: "gemini-embedding-2 · 768d" },
  { key: "stored", label: "Stored", detail: "pgvector" },
  { key: "searched", label: "Searched", detail: "Cosine · top 5" },
  { key: "answered", label: "Answered", detail: "LLM + context · SSE" },
];

/**
 * status: { [stepKey]: "done" | "active" | "error" }
 * notes:  { [stepKey]: string } extra live info, e.g. "12 chunks"
 */
export default function PipelineProgress({ status = {}, notes = {}, compact = false }) {
  return (
    <ol className={`grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "sm:grid-cols-2 lg:grid-cols-7"}`}>
      {STEPS.map((step, i) => {
        const state = status[step.key];
        const circle =
          state === "done"
            ? "bg-emerald-500 text-black"
            : state === "active"
              ? "bg-indigo-500 text-white animate-pulse"
              : state === "error"
                ? "bg-red-500 text-white"
                : "bg-slate-800 text-slate-300";

        return (
          <li key={step.key} className="flex lg:flex-col items-center lg:text-center gap-3 lg:gap-2">
            <span className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${circle}`}>
              {state === "done" ? "✓" : state === "error" ? "!" : i + 1}
            </span>
            <div className="min-w-0">
              <p className="font-medium text-sm">{step.label}</p>
              <p className="text-xs text-slate-400">{notes[step.key] || step.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
