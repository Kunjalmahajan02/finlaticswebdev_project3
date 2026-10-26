import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import prisma from "@/lib/db";
import { ensureSample } from "@/lib/sampleDoc";
import { SAMPLE_ID } from "@/lib/sampleIds";
import { readSSE } from "@/lib/sse";
import PdfUploader from "@/components/PdfUploader";
import PipelineProgress from "@/components/PipelineProgress";
import DocumentCard from "@/components/DocumentCard";

export async function getServerSideProps() {
  try {
    await ensureSample();
    const docs = await prisma.document.findMany({
      where: { status: "ready" },
      orderBy: [{ isSample: "desc" }, { createdAt: "desc" }],
      select: { id: true, title: true, pageCount: true, chunkCount: true, tokenCount: true, isSample: true, createdAt: true },
      take: 6,
    });
    return { props: { docs: docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })) } };
  } catch (err) {
    console.error(err);
    return { props: { docs: [] } };
  }
}

export default function Home({ docs }) {
  const router = useRouter();
  const [status, setStatus] = useState({});
  const [notes, setNotes] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const mark = (key, state, note) => {
    setStatus((s) => ({ ...s, [key]: state }));
    if (note) setNotes((n) => ({ ...n, [key]: note }));
  };

  async function handleFile(file) {
    setError("");
    setStatus({});
    setNotes({});
    if (file.type !== "application/pdf") return setError("Only PDF files are allowed.");
    if (file.size > 4 * 1024 * 1024) return setError("File is larger than 4 MB.");

    setBusy(true);
    let current = "uploaded";
    try {
      // Steps 1–2: upload + text extraction
      mark("uploaded", "active", file.name);
      mark("extracted", "active");
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const uploaded = await res.json();
      if (!res.ok) throw new Error(uploaded.error);
      mark("uploaded", "done");
      mark("extracted", "done", `${uploaded.pageCount} pages · ${uploaded.charCount.toLocaleString("en-IN")} chars`);

      // Steps 3–5: chunk → embed → store, streamed as SSE progress events
      current = "chunked";
      mark("chunked", "active");
      const processRes = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: uploaded.id }),
      });
      if (!processRes.ok) throw new Error((await processRes.json()).error);

      let finished = false;
      await readSSE(processRes, (event, data) => {
        if (event === "chunked") {
          mark("chunked", "done", `${data.chunkCount} chunks${data.truncated ? " (first part only)" : ""}`);
          current = "embedded";
          mark("embedded", "active");
        } else if (event === "embedding") {
          mark("embedded", "active", `${data.done}/${data.total} chunks`);
        } else if (event === "embedded") {
          mark("embedded", "done", `${data.dimensions}-dim vectors`);
          current = "stored";
          mark("stored", "active");
        } else if (event === "stored") {
          mark("stored", "done", `${data.chunkCount} rows in pgvector`);
        } else if (event === "done") {
          finished = true;
        } else if (event === "error") {
          throw new Error(data.error);
        }
      });
      if (!finished) throw new Error("Processing stopped unexpectedly. Please try again.");

      mark("searched", undefined, "Ready for questions");
      setTimeout(() => router.push(`/chat/${uploaded.id}`), 700);
    } catch (err) {
      mark(current, "error");
      setError(err.message || "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <>
      <section className="text-center pt-6 pb-10">
        <p className="text-indigo-400 font-medium mb-3">AI Chatbot with Document RAG</p>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Chat with any <span className="text-indigo-400">PDF</span>
        </h1>
        <p className="text-slate-400 text-lg mt-4 max-w-2xl mx-auto">
          Upload a document and ask questions. Answers stream in live and cite the exact passages they came from.
          No sign-up needed.
        </p>
      </section>

      <section className="max-w-2xl mx-auto">
        <PdfUploader onFile={handleFile} disabled={busy} />
        {error && <p className="mt-4 text-center text-red-400 text-sm">{error}</p>}
        <p className="text-center text-sm text-slate-400 mt-4">
          No PDF handy?{" "}
          <Link href={`/chat/${SAMPLE_ID}`} className="text-indigo-400 hover:underline">
            Try the sample document →
          </Link>
        </p>
      </section>

      <section className="mt-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="font-semibold mb-1">RAG pipeline</h2>
        <p className="text-sm text-slate-400 mb-5">
          {busy ? "Processing your document..." : "Steps 1–5 run when you upload. Steps 6–7 run for every question."}
        </p>
        <PipelineProgress status={status} notes={notes} />
      </section>

      {docs.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent documents</h2>
            <Link href="/documents" className="text-sm text-indigo-400 hover:underline">
              View all →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {docs.map((d) => (
              <DocumentCard key={d.id} doc={d} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
