// What the app does, named after the project's feature checklist so reviewers can match them up
export default function FeatureList({ providers }) {
  const features = [
    ["📄", "PDF upload", "Drag and drop a PDF on this page. Text is extracted per page with pdf-parse."],
    ["✂️", "Text chunking", "500-token chunks with a 50-token overlap, counted with a real tokenizer."],
    [
      "🧮",
      providers.openai ? "OpenAI embeddings" : "Embeddings (OpenAI-ready)",
      `Each chunk becomes a 768-dimension vector. In use now: ${providers.embedding}.`,
    ],
    ["🔎", "Vector similarity search", "pgvector cosine similarity finds the top 5 most relevant chunks."],
    [
      "🤖",
      providers.claude ? "Claude RAG integration" : "RAG answers (Claude-ready)",
      `The model answers only from the retrieved chunks. In use now: ${providers.answer}.`,
    ],
    ["⚡", "Streaming chat", "Answers stream word by word over Server-Sent Events (SSE)."],
    ["📌", "Source citations", "Every answer cites [1]–[5]. Click one to see the chunk, its page and its match score."],
    ["🔓", "No sign-up", "Every feature works right away, including a built-in sample document."],
  ];

  return (
    <section className="mt-12" aria-labelledby="features-heading">
      <h2 id="features-heading" className="text-xl font-semibold mb-4">
        Features
      </h2>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map(([icon, title, text]) => (
          <li key={title} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <div className="text-2xl mb-2" aria-hidden="true">
              {icon}
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-slate-400 mt-1 break-words">{text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
