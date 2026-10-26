import prisma from "@/lib/db";
import { processDocument } from "@/lib/pipeline";
import { SAMPLE_ID } from "@/lib/sampleIds";

// A built-in document so anyone (including reviewers) can try the chat without uploading a file

const SAMPLE_PAGES = [
  `A Practical Guide to Retrieval-Augmented Generation (RAG)

What is RAG?
Large language models are trained on a fixed snapshot of public data. They do not know the contents of your private documents, your company handbook, or a PDF you downloaded this morning. Retrieval-Augmented Generation, usually shortened to RAG, solves this by finding the most relevant pieces of your own documents and giving them to the model as context right before it answers. The model then writes its answer grounded in those passages instead of relying only on memory.

RAG has two phases. The indexing phase happens once per document: the text is extracted, split into chunks, converted into embeddings, and stored in a vector database. The query phase happens every time a user asks a question: the question is embedded, the closest chunks are retrieved, and the language model answers using them.

Why not paste the whole document into the prompt?
Models have a limited context window, long prompts are slow and expensive, and models pay less attention to details buried in the middle of very long inputs. Sending only the five or so most relevant passages keeps answers fast, cheap, and focused.`,

  `Step by step: the indexing pipeline

1. Upload. The user uploads a PDF through the web app.

2. Text extraction. A library such as pdf-parse reads the PDF and returns plain text. Scanned PDFs that are only images contain no text layer and need OCR first.

3. Chunking. The text is split into chunks of about 500 tokens. A token is roughly three quarters of an English word. Each chunk overlaps the previous one by about 50 tokens. The overlap matters because an important sentence might otherwise be cut in half at a chunk boundary; with overlap, the full sentence appears in at least one chunk.

4. Embedding. Each chunk is sent to an embedding model, which turns the text into a vector: a list of hundreds of numbers that captures its meaning. Texts with similar meanings produce vectors that point in similar directions, even when they use different words. This project uses Google's gemini-embedding-2 model with 768 dimensions.

5. Storage. The vectors are stored in PostgreSQL using the pgvector extension, which adds a vector column type and distance operators. Keeping vectors next to normal relational data means one database can hold users, documents, chunks and embeddings together.`,

  `Step by step: the query pipeline

6. Search. When a question arrives, it is embedded with the same model. The database then ranks chunks by cosine similarity, which measures the angle between two vectors: a value of 1 means they point the same way, 0 means unrelated. In pgvector the <=> operator returns cosine distance, so similarity equals one minus distance. The top 5 chunks are kept.

7. Answer. The question and the top chunks are sent to a language model with instructions to answer only from the provided passages and to cite them by number. The answer is streamed to the browser using Server-Sent Events, so words appear as they are generated instead of after a long wait. Showing source citations lets users check every claim against the original text.

Common mistakes
- Chunks that are too large dilute the meaning of the embedding; chunks that are too small lose context.
- Forgetting the overlap, which splits key sentences across chunks.
- Embedding questions and documents with different models, which makes similarity scores meaningless.
- Letting the model answer from general knowledge instead of the retrieved context, which causes confident but unsupported answers.
- Not showing sources, which makes answers impossible to verify.

Summary
RAG lets a general-purpose model answer accurately about your own documents by combining search with generation: extract, chunk, embed, store, search, and answer with citations.`,
];

/** Creates and indexes the sample document the first time it's needed. Never throws. */
export async function ensureSample() {
  try {
    const existing = await prisma.document.findUnique({ where: { id: SAMPLE_ID } });
    if (existing?.status === "ready") return;
    // Another request is indexing it; retry only if that attempt looks stuck (e.g. killed by a timeout)
    const stuck = Date.now() - existing?.createdAt?.getTime() > 3 * 60 * 1000;
    if (existing?.status === "processing") {
      if (!stuck) return;
      // Mark the stuck attempt failed so processDocument can claim it again
      await prisma.document.updateMany({ where: { id: SAMPLE_ID, status: "processing" }, data: { status: "failed" } });
    }

    if (!existing) {
      await prisma.document.create({
        data: {
          id: SAMPLE_ID,
          title: "A Practical Guide to RAG",
          fileName: "rag-guide-sample.pdf",
          pages: SAMPLE_PAGES,
          pageCount: SAMPLE_PAGES.length,
          isSample: true,
        },
      });
    }
    await processDocument(SAMPLE_ID);
  } catch (err) {
    // Another request may be creating it at the same time, or keys may be missing; the page still renders
    console.error("[sample] Could not prepare sample document:", err.message);
  }
}
