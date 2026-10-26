// Shows the top-5 retrieved chunks used for an answer, with page and cosine similarity
export default function ChunkSourceList({ sources, openSource, onToggle }) {
  if (!sources?.length) return null;

  return (
    <div className="mt-3">
      <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Sources (top {sources.length} by cosine similarity)</p>
      <ul className="space-y-2">
        {sources.map((s) => {
          const open = openSource === s.n;
          return (
            <li key={s.n} id={`source-${s.n}`} className="rounded-xl border border-slate-700 bg-slate-950">
              <button
                onClick={() => onToggle(open ? null : s.n)}
                className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-left text-sm"
                aria-expanded={open}
              >
                <span className="shrink-0 w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-bold flex items-center justify-center">
                  {s.n}
                </span>
                <span className="text-slate-300">Page {s.page}</span>
                <span className="hidden sm:inline text-slate-500">· chunk #{s.index + 1}</span>
                <span className="ml-auto text-xs text-emerald-400">{(s.similarity * 100).toFixed(1)}% match</span>
                <span className="text-slate-500">{open ? "▾" : "▸"}</span>
              </button>
              {open && (
                <p className="px-3 pb-3 text-sm text-slate-400 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {s.content}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
