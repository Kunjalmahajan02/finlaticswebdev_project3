import Link from "next/link";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

export default function DocumentCard({ doc }) {
  return (
    <Link
      href={`/chat/${doc.id}`}
      className="block rounded-2xl border border-slate-800 bg-slate-900 p-5 hover:border-indigo-400 transition"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug break-words min-w-0">{doc.title}</h3>
        {doc.isSample && (
          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300">Sample</span>
        )}
      </div>
      <p className="text-sm text-slate-400 mt-2">
        {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"} · {doc.chunkCount} chunks · {doc.tokenCount.toLocaleString("en-IN")} tokens
      </p>
      <p className="text-xs text-slate-500 mt-1">{formatDate(doc.createdAt)}</p>
      <p className="text-sm text-indigo-400 mt-3">Chat with this document →</p>
    </Link>
  );
}
