import { getEncoding } from "js-tiktoken";

// Step 3 of the pipeline: split text into overlapping token windows
export const CHUNK_SIZE = 500; // tokens per chunk
export const CHUNK_OVERLAP = 50; // tokens shared with the previous chunk

let encoder;
const enc = () => (encoder ??= getEncoding("cl100k_base"));

export function countTokens(text) {
  return enc().encode(text).length;
}

/**
 * Chunks a document given as an array of page texts.
 * Tokens from all pages are joined into one stream so chunks can span page breaks;
 * each chunk records the page it starts on for citations.
 */
export function chunkPages(pages, { size = CHUNK_SIZE, overlap = CHUNK_OVERLAP } = {}) {
  const tokens = [];
  const pageStarts = []; // token index where each page begins

  pages.forEach((pageText, i) => {
    pageStarts.push(tokens.length);
    if (pageText) tokens.push(...enc().encode(pageText + (i < pages.length - 1 ? "\n\n" : "")));
  });

  const pageAt = (tokenIndex) => {
    let page = 0;
    while (page + 1 < pageStarts.length && pageStarts[page + 1] <= tokenIndex) page++;
    return page + 1;
  };

  const chunks = [];
  const step = size - overlap;

  for (let start = 0; start < tokens.length; start += step) {
    const slice = tokens.slice(start, start + size);
    const content = enc().decode(slice).trim();
    if (content) {
      chunks.push({ index: chunks.length, page: pageAt(start), content, tokenCount: slice.length });
    }
    if (start + size >= tokens.length) break;
  }

  return { chunks, tokenCount: tokens.length };
}
