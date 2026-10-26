import crypto from "crypto";
import fs from "fs/promises";
import formidable from "formidable";
import prisma from "@/lib/db";
import { parsePDF } from "@/lib/pdfParser";

// formidable reads the multipart body itself
export const config = { api: { bodyParser: false } };

const MAX_SIZE = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit

// Steps 1–2: receive the PDF and extract its text
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const form = formidable({ maxFileSize: MAX_SIZE });
    const [, files] = await form.parse(req);
    const file = files.file?.[0];

    if (!file) return res.status(400).json({ error: "No file uploaded" });
    if (file.mimetype !== "application/pdf") return res.status(400).json({ error: "Only PDF files are allowed" });

    const pages = await parsePDF(await fs.readFile(file.filepath));
    const charCount = pages.reduce((sum, p) => sum + p.length, 0);
    if (charCount < 50) {
      return res.status(422).json({ error: "Couldn't find any text in this PDF. Is it a scanned image?" });
    }

    const fileName = file.originalFilename || "document.pdf";
    const doc = await prisma.document.create({
      data: {
        id: crypto.randomUUID(),
        title: fileName.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim() || "Untitled",
        fileName,
        pages,
        pageCount: pages.length,
      },
    });

    res.status(200).json({ id: doc.id, title: doc.title, pageCount: pages.length, charCount });
  } catch (err) {
    console.error(err);
    const tooBig = err.code === 1009 || err.httpCode === 413;
    res.status(tooBig ? 413 : 500).json({ error: tooBig ? "File is larger than 4 MB" : "Upload failed. Please try again." });
  }
}
