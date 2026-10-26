// Import the inner module directly: pdf-parse's index.js runs a debug test on load
import pdf from "pdf-parse/lib/pdf-parse.js";

// Step 2 of the pipeline: PDF → text, kept per page so answers can cite page numbers
export async function parsePDF(buffer) {
  const pages = [];

  await pdf(buffer, {
    // pdf-parse renders pages in order, one at a time
    pagerender: async (pageData) => {
      const content = await pageData.getTextContent();
      let text = "";
      let lastY;
      for (const item of content.items) {
        const y = item.transform[5];
        text += lastY === undefined || lastY === y ? item.str : `\n${item.str}`;
        lastY = y;
      }
      pages.push(cleanText(text));
      return text;
    },
  });

  return pages;
}

function cleanText(text) {
  return text
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
