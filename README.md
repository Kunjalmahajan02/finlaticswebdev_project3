# 📚 DocChat: AI Chatbot with Document RAG

Upload a PDF and chat with it. Answers stream in live and cite the exact passages (with page numbers) they came from. **No sign-up needed**: open the site and use every feature right away.

## Features

| Feature | Status | How it works | Code |
|---|---|---|---|
| **PDF upload** | ✅ | Drag-and-drop or click-to-browse upload on the home page, max 4 MB, multipart parsed with formidable | `components/PdfUploader.jsx`, `pages/api/upload.js` |
| **Text extraction** | ✅ | **pdf-parse**, kept per page for page-level citations | `lib/pdfParser.js` |
| **Text chunking** | ✅ | **500 tokens with a 50-token overlap** (cl100k tokenizer via js-tiktoken) | `lib/chunker.js` |
| **OpenAI embeddings** | ✅ | **OpenAI `text-embedding-3-small`** (official `openai` SDK, 768 dimensions). Falls back to Google `gemini-embedding-2` (free tier) when no OpenAI key is set | `lib/embedder.js` |
| **Vector storage** | ✅ | Supabase Postgres + **pgvector** `vector(768)` column, serialized with the `pgvector` npm package | `lib/vectorSearch.js`, `sql/enable-pgvector.sql` |
| **Vector similarity search** | ✅ | **Cosine similarity** with pgvector's `<=>` operator, **top 5 chunks** per question | `lib/vectorSearch.js` |
| **Claude RAG integration** | ✅ | **Claude** (official `@anthropic-ai/sdk`, `claude-opus-5-5`) answers only from the retrieved chunks. Falls back to Groq (free tier) when no Anthropic key is set | `lib/claudeRAG.js` |
| **Streaming chat** | ✅ | Answers stream token by token over **Server-Sent Events (SSE)**; upload progress streams the same way | `pages/api/chat.js`, `pages/api/process.js`, `lib/sse.js` |
| **Source citations** | ✅ | Every answer cites **[1]–[5]**. Clicking a citation opens the source chunk with its **page number** and **similarity score** | `components/ChatMessage.jsx`, `components/ChunkSourceList.jsx` |
| **Deployed to Vercel** | ✅ | Tables are created automatically on each build | `scripts/setup-db.js` |

The home page shows which embedding and answer models the live deployment is using right now.

## How to test it (2 minutes)

1. Open the live site. The **PDF upload box is the first thing on the home page**.
2. **Fastest path:** click **"Try the sample document"** (also in the top nav). It opens a chat with a pre-indexed guide. Click a suggested question.
3. Watch the answer **stream in word by word**. Click a citation like **[1]** to open the source chunk, its **page** and its **cosine similarity score**.
4. **Full pipeline:** go back to the home page and drop in any text-based PDF. The pipeline tracker lights up each step live: uploaded → text extracted → chunked → embedded → stored. You're then taken to the chat for that document.
5. **/documents** lists every indexed PDF.

## RAG pipeline

```
PDF ─► pdf-parse ─► 500-token chunks (50 overlap) ─► embeddings (768d) ─► pgvector
                                                                              │
question ─► embedding ─► cosine search (top 5) ◄──────────────────────────────┘
                              │
                              └─► Claude + context ─► SSE stream with [n] citations
```

| # | Step | Implementation |
|---|---|---|
| 1 | PDF uploaded | `pages/api/upload.js` |
| 2 | Text extracted | `lib/pdfParser.js` (pdf-parse) |
| 3 | Chunked | `lib/chunker.js` (500 tokens, 50 overlap) |
| 4 | Embedded | `lib/embedder.js` (OpenAI text-embedding-3-small, or Gemini fallback) |
| 5 | Stored | `lib/vectorSearch.js` → `storeChunks` (pgvector) |
| 6 | Searched | `lib/vectorSearch.js` → `searchChunks` (cosine, top 5) |
| 7 | Answered | `lib/claudeRAG.js` (Claude, or Groq fallback) streamed via `pages/api/chat.js` |

## Providers and API keys

The code integrates **OpenAI** for embeddings and **Claude** for answers, as the project brief specifies. Both are paid APIs, so each one has a free fallback and the app runs without either key:

| Step | With the key set | Without it (free fallback) |
|---|---|---|
| Embeddings | `OPENAI_API_KEY` → OpenAI `text-embedding-3-small` | `GEMINI_API_KEY` → Google `gemini-embedding-2` |
| Answers | `ANTHROPIC_API_KEY` → Claude `claude-opus-5-5` | `GROQ_API_KEY` → Groq `openai/gpt-oss-120b` |

Each document records which embedding model indexed it, because OpenAI and Gemini vectors can't be compared. The built-in sample re-indexes itself automatically when the provider changes.

## Tech stack

Next.js 14 (Pages Router) · Tailwind CSS · pdf-parse · js-tiktoken · OpenAI SDK · Anthropic SDK · Supabase (PostgreSQL + pgvector) · Prisma · Vercel

## Project structure

```
components/  PdfUploader, PipelineProgress, FeatureList, DocumentCard, ChatMessage, ChunkSourceList, Header
lib/         pdfParser, chunker, embedder, vectorSearch, claudeRAG, pipeline, sse, sampleDoc, db
pages/       index (upload), documents, chat/[docId]
pages/api/   upload (steps 1–2), process (steps 3–5, SSE), chat (steps 6–7, SSE)
sql/         enable-pgvector.sql (extension + tables)
scripts/     setup-db.js (runs the SQL before each build)
```

## Run locally

1. Copy `.env.example` to `.env` and fill in the values (see `TUTORIAL.md`).
2. `npm install`
3. `npm run db:setup` creates the pgvector extension and tables.
4. `npm run dev`

## Notes

- Tables are created with `CREATE ... IF NOT EXISTS` SQL instead of `prisma db push`, so this app can safely share a Supabase database with other projects.
- A single upload indexes up to 80 chunks (about 40k tokens) to stay within free-tier limits. Longer PDFs are indexed from the start.
- Scanned (image-only) PDFs have no text layer and are rejected with a clear message.
