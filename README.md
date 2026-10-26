# 📚 DocChat: AI Chatbot with Document RAG

Upload a PDF and chat with it. Answers stream in live and cite the exact passages (with page numbers) they came from. **No sign-up needed**: open the site and use every feature right away.

## How to test it (2 minutes)

1. Open the live site. The **upload box is on the home page**.
2. **Fastest path:** click **"Try the sample document"** (also in the top nav). It opens a chat with a pre-indexed guide. Click a suggested question.
3. Watch the answer **stream in word by word (SSE)**. Click a citation like **[1]** to open the source chunk, its **page number** and its **cosine similarity score**.
4. **Full pipeline:** go back to the home page and drop in any text-based PDF (max 4 MB). The pipeline tracker lights up each step live: uploaded → text extracted → chunked → embedded → stored. You're then taken to the chat for that document.
5. **/documents** lists every indexed PDF.

## RAG pipeline

| # | Step | Implementation | File |
|---|---|---|---|
| 1 | PDF uploaded | Drag-and-drop upload, multipart parsed with formidable | `components/PdfUploader.jsx`, `pages/api/upload.js` |
| 2 | Text extracted | **pdf-parse**, kept per page for page-level citations | `lib/pdfParser.js` |
| 3 | Chunked | **500 tokens with 50-token overlap** (cl100k tokenizer via js-tiktoken) | `lib/chunker.js` |
| 4 | Embedded | Google **gemini-embedding-2**, 768 dimensions, batched | `lib/embedder.js` |
| 5 | Stored | Supabase Postgres + **pgvector** `vector(768)` column | `lib/vectorSearch.js`, `sql/enable-pgvector.sql` |
| 6 | Searched | **Cosine similarity** (`<=>` operator), **top 5 chunks** | `lib/vectorSearch.js` |
| 7 | Answered | LLM (Groq, `openai/gpt-oss-120b`) answers only from the context, **streamed over SSE**, with **[n] source citations** | `lib/ragAnswer.js`, `pages/api/chat.js` |

Steps 3–5 stream progress events to the browser (`pages/api/process.js`), so the UI shows the pipeline running live.

## Core concepts covered

- ✅ Chunking: 500 tokens, 50 overlap
- ✅ Embeddings: Gemini `gemini-embedding-2`. The brief suggests OpenAI `text-embedding-3`; Gemini was used because it has a free tier. Swapping providers only touches `lib/embedder.js` (and the vector size).
- ✅ Vector similarity: cosine search in pgvector
- ✅ Context window: top 5 chunks
- ✅ Streaming response: Server-Sent Events
- ✅ Source citations: numbered, expandable, with page and similarity score

## Tech stack

Next.js 14 (Pages Router) · Tailwind CSS · pdf-parse · js-tiktoken · Gemini embeddings · Supabase (PostgreSQL + pgvector) · Prisma · Groq · Vercel

## Project structure

```
components/  PdfUploader, PipelineProgress, DocumentCard, ChatMessage, ChunkSourceList, Header
lib/         pdfParser, chunker, embedder, vectorSearch, ragAnswer, pipeline, sse, sampleDoc, db
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
- To stay within free-tier limits, a single upload indexes up to 80 chunks (about 40k tokens). Longer PDFs are indexed from the start.
- Scanned (image-only) PDFs have no text layer and are rejected with a clear message.
