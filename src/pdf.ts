import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[\t ]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const headSize = Math.floor(maxChars * 0.65);
  const tailSize = maxChars - headSize;
  const head = text.slice(0, headSize).trim();
  const tail = text.slice(-tailSize).trim();

  return [
    head,
    "\n\n[... middle of paper omitted for CLI context window ...]\n\n",
    tail,
  ].join("");
}

export async function extractPaperText(filePath: string, maxChars: number): Promise<{ fileName: string; text: string }> {
  const absolutePath = path.resolve(filePath);
  const fileName = path.basename(absolutePath);
  const extension = path.extname(fileName).toLowerCase();

  if (![".pdf", ".txt", ".md"].includes(extension)) {
    throw new Error(`Unsupported file type: ${extension}. Use .pdf, .txt, or .md`);
  }

  const fileBuffer = await fs.readFile(absolutePath);

  let rawText = "";
  if (extension === ".pdf") {
    const result = await pdfParse(fileBuffer);
    rawText = result.text;
  } else {
    rawText = fileBuffer.toString("utf8");
  }

  const normalized = normalizeWhitespace(rawText);
  if (!normalized) {
    throw new Error(`No extractable text found in ${fileName}`);
  }

  return {
    fileName,
    text: trimContext(normalized, maxChars),
  };
}
