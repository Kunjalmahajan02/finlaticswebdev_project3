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

  `Choosing a chunk size

Chunk size is a trade-off between precision and context. Small chunks, around 100 to 200 tokens, produce very focused embeddings, so search finds exactly the right sentence, but each chunk carries little surrounding context and the model may not understand it on its own. Large chunks, above 1,000 tokens, keep plenty of context but mix several topics into one embedding, which blurs its meaning and makes it match many unrelated questions weakly.

Around 500 tokens is a widely used middle ground for prose such as reports, manuals and articles. It is roughly one to two pages of a typical PDF: enough to hold a complete idea, small enough to stay on one topic. Documents with very short, dense entries, such as FAQs or glossaries, often work better with smaller chunks, while long narrative text can use larger ones.

Counting by tokens rather than characters matters because embedding models and language models have limits measured in tokens. Splitting by a fixed number of characters can cut words in half and produces chunks of very different token lengths. A tokenizer such as cl100k gives consistent chunk sizes regardless of language or formatting.

Overlap is usually set to around 10 percent of the chunk size. With 500-token chunks, a 50-token overlap repeats the last few sentences of each chunk at the start of the next one. More overlap improves recall at the cost of storing more duplicate text; zero overlap risks losing facts that sit exactly on a boundary.`,

  `How embeddings capture meaning

An embedding model is a neural network trained so that texts with similar meanings end up close together in a high-dimensional space. During training it sees pairs of related texts, such as a question and its answer or a title and its article, and learns to pull them together while pushing unrelated texts apart.

The result is that the sentence "How do I reset my password?" lands near "Steps to recover your account login" even though the two share almost no words. Traditional keyword search would miss this match entirely. This ability to match meaning rather than exact wording is called semantic search, and it is the main reason RAG works well with natural questions.

Each dimension of an embedding does not have a single human-readable meaning. Instead, meaning is spread across all the numbers together. More dimensions can capture finer distinctions but cost more storage and slower search. Modern models such as gemini-embedding-2 can output shorter vectors, for example 768 instead of 3072 dimensions, while keeping most of the quality, which is a good trade-off for small projects.

The same embedding model must be used for both documents and questions. Vectors from two different models live in different spaces, and comparing them gives meaningless scores. If the model is ever changed, every stored chunk has to be embedded again.`,

  `Vector indexes and scaling

For a single document with a few dozen chunks, the database can simply compare the question vector against every chunk and sort the results. This exact search is fast at small scale and always returns the true nearest neighbours.

With millions of chunks, comparing against every row becomes too slow, so vector databases use approximate nearest neighbour indexes. pgvector supports two main types. HNSW, short for Hierarchical Navigable Small World, builds a layered graph that lets a search jump quickly toward the closest vectors; it gives high accuracy and fast queries but uses more memory and takes longer to build. IVFFlat groups vectors into clusters and only searches the clusters nearest to the query; it builds faster and uses less memory but is usually less accurate.

Approximate indexes trade a little accuracy for a lot of speed. They can also interact badly with filters: if the search must be limited to one document, an approximate index may return its top matches from other documents first and leave too few results after filtering. For per-document chat with a modest number of chunks, a plain index on the document id combined with exact search is simpler and fully accurate.`,

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

  `Grounding, prompting and citations

Retrieval only helps if the language model actually uses the retrieved text. The prompt therefore tells the model to answer only from the numbered passages, to cite the passage number after every fact, and to say clearly when the answer is not in the document. This instruction is called grounding. Without it, models tend to fill gaps with general knowledge, which sounds convincing but may be wrong for this specific document.

Numbering the passages makes citations easy to verify. The interface turns each citation into a clickable marker that reveals the original chunk, its page number and its similarity score. Users can check a claim in seconds instead of searching the whole PDF.

Five passages of about 500 tokens each add roughly 2,500 tokens of context to every question. This fits comfortably in modern context windows while leaving room for the conversation history and the answer. Sending more passages can help with broad questions such as summaries, but it also adds noise and cost.

Streaming with Server-Sent Events keeps the experience responsive. The server sends the list of sources first, then each piece of the answer as soon as the model generates it, and finally a done event. The browser reads this stream and updates the message as text arrives, so the first words appear within a second or two.`,

  `Evaluating a RAG system

A RAG system can fail in two places, so it is evaluated in two parts. Retrieval quality asks whether the right passages were found: for a set of test questions with known answers, check whether the passage containing the answer appears in the top five results. This is called recall at five. If retrieval fails, no prompt can save the answer.

Generation quality asks whether the answer is correct, complete and supported by the cited passages. A useful check is faithfulness: every sentence in the answer should be backed by at least one cited passage. Answers that add unsupported details are a sign that the grounding instructions need strengthening or that the temperature is too high.

Practical improvements often come from the data rather than the model. Cleaning extracted text, removing repeated headers and footers, choosing a better chunk size, and adding the document title to each chunk before embedding can all raise retrieval quality noticeably. Hybrid search, which combines keyword matching with vector similarity, helps with exact terms such as product codes, names and numbers that embeddings sometimes miss.

Glossary
- Token: a small piece of text, roughly three quarters of a word, used to measure model input and output.
- Embedding: a vector of numbers representing the meaning of a text.
- Cosine similarity: a measure of how closely two vectors point in the same direction.
- pgvector: a PostgreSQL extension for storing and searching vectors.
- Context window: the maximum amount of text a model can read in one request.
- SSE: Server-Sent Events, a simple way for a server to stream updates to a browser.`,
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
      // Remove older versions of the sample
      await prisma.document.deleteMany({ where: { isSample: true, id: { not: SAMPLE_ID } } });
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
