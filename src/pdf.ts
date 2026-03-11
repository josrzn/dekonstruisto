import fs from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";

export interface PaperSections {
  title: string | null;
  abstract: string | null;
  introduction: string | null;
  conclusion: string | null;
  body: string;
}

export interface ExtractedPaper {
  fileName: string;
  text: string;
  sections: PaperSections;
}

interface HeadingMatch {
  index: number;
  type: "abstract" | "introduction" | "conclusion" | "discussion" | "references" | "other";
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/[ ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimContext(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text;
  }

  const headSize = Math.floor(maxChars * 0.7);
  const tailSize = maxChars - headSize;
  const head = text.slice(0, headSize).trim();
  const tail = text.slice(-tailSize).trim();

  return [head, "\n\n[... middle of paper omitted for CLI context window ...]\n\n", tail].join("");
}

function cleanSectionText(text: string): string | null {
  const cleaned = text
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function detectHeading(line: string): HeadingMatch["type"] | null {
  const normalized = line.trim();
  const match = normalized.match(/^(?:[0-9]+(?:\.[0-9]+)*\s+)?([A-Za-z][A-Za-z /&-]{1,80})$/);
  const candidate = match?.[1]?.trim().toLowerCase();

  if (!candidate) {
    return null;
  }

  if (candidate === "abstract") {
    return "abstract";
  }
  if (candidate === "introduction") {
    return "introduction";
  }
  if (candidate === "conclusion" || candidate === "conclusions") {
    return "conclusion";
  }
  if (candidate === "discussion" || candidate === "discussion and conclusion" || candidate === "conclusion and discussion") {
    return "discussion";
  }
  if (candidate === "references" || candidate === "bibliography") {
    return "references";
  }

  if (/^(related work|background|method|methods|results|experiments|evaluation|limitations|appendix|appendices)$/.test(candidate)) {
    return "other";
  }

  return null;
}

function collectHeadings(lines: string[]): HeadingMatch[] {
  const headings: HeadingMatch[] = [];

  lines.forEach((line, index) => {
    const type = detectHeading(line);
    if (type) {
      headings.push({ index, type });
    }
  });

  return headings;
}

function findFirstHeadingIndex(headings: HeadingMatch[], ...types: HeadingMatch["type"][]): number | null {
  const match = headings.find((heading) => types.includes(heading.type));
  return match ? match.index : null;
}

function getNextHeadingIndex(headings: HeadingMatch[], currentIndex: number): number | null {
  const match = headings.find((heading) => heading.index > currentIndex);
  return match ? match.index : null;
}

function extractSection(lines: string[], headings: HeadingMatch[], type: HeadingMatch["type"]): string | null {
  const heading = headings.find((item) => item.type === type);
  if (!heading) {
    return null;
  }

  const start = heading.index + 1;
  const end = getNextHeadingIndex(headings, heading.index) ?? lines.length;
  return cleanSectionText(lines.slice(start, end).join("\n"));
}

function inferTitle(lines: string[], headings: HeadingMatch[]): string | null {
  const cutoff = findFirstHeadingIndex(headings, "abstract", "introduction", "other", "conclusion", "discussion", "references") ?? Math.min(lines.length, 12);
  const candidates = lines
    .slice(0, cutoff)
    .map((line) => line.trim())
    .filter((line) => line.length >= 8)
    .filter((line) => !/^\d+$/.test(line))
    .filter((line) => line.split(" ").length <= 25)
    .filter((line) => !/@/.test(line))
    .filter((line) => !/^(abstract|introduction)$/i.test(line));

  return candidates[0] ?? null;
}

export function parsePaperSections(text: string): PaperSections {
  const normalized = normalizeWhitespace(text);
  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const headings = collectHeadings(lines);
  const referencesIndex = findFirstHeadingIndex(headings, "references");
  const bodyLines = referencesIndex === null ? lines : lines.slice(0, referencesIndex);

  const abstract = extractSection(lines, headings, "abstract");
  const introduction = extractSection(lines, headings, "introduction");
  const conclusion = extractSection(lines, headings, "conclusion") ?? extractSection(lines, headings, "discussion");
  const title = inferTitle(lines, headings);

  return {
    title,
    abstract,
    introduction,
    conclusion,
    body: cleanSectionText(bodyLines.join("\n")) ?? normalized,
  };
}

export function buildPaperContext(sections: PaperSections, maxChars: number): string {
  const parts = [
    sections.title ? `Title\n${sections.title}` : null,
    sections.abstract ? `Abstract\n${sections.abstract}` : null,
    sections.introduction ? `Introduction\n${sections.introduction}` : null,
    sections.conclusion ? `Conclusion\n${sections.conclusion}` : null,
    `Main Body\n${sections.body}`,
  ].filter((value): value is string => Boolean(value));

  return trimContext(parts.join("\n\n"), maxChars);
}

export async function extractPaperText(filePath: string, maxChars: number): Promise<ExtractedPaper> {
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

  const sections = parsePaperSections(normalized);

  return {
    fileName,
    text: buildPaperContext(sections, maxChars),
    sections,
  };
}
