import dns from "node:dns/promises";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import pdfParse from "pdf-parse";

const DEFAULT_DOWNLOAD_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_DOWNLOAD_BYTES = 25 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = new Set([".pdf", ".txt", ".md"]);

export interface PaperSections {
  title: string | null;
  abstract: string | null;
  introduction: string | null;
  conclusion: string | null;
  body: string;
}

export interface ExtractedPaper {
  fileName: string;
  rawText: string;
  text: string;
  sections: PaperSections;
}

interface HeadingMatch {
  index: number;
  type: "abstract" | "introduction" | "conclusion" | "discussion" | "references" | "other";
}

interface LoadedInput {
  fileName: string;
  extension: string;
  buffer: Buffer;
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
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();
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
  const cutoff =
    findFirstHeadingIndex(headings, "abstract", "introduction", "other", "conclusion", "discussion", "references") ??
    Math.min(lines.length, 12);
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

export function trimPaperContext(text: string, maxChars: number): string {
  return trimContext(text, maxChars);
}

export function isRemoteHttpUrl(input: string): boolean {
  try {
    const url = new URL(input);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isPrivateIpAddress(address: string): boolean {
  const family = net.isIP(address);

  if (family === 4) {
    const [a, b] = address.split(".").map((part) => Number(part));
    if (a === 10 || a === 127) {
      return true;
    }
    if (a === 169 && b === 254) {
      return true;
    }
    if (a === 192 && b === 168) {
      return true;
    }
    if (a === 172 && b >= 16 && b <= 31) {
      return true;
    }
    return false;
  }

  if (family === 6) {
    const normalized = address.toLowerCase();
    return (
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb")
    );
  }

  return false;
}

function contentTypeToExtension(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.toLowerCase();
  if (normalized.includes("application/pdf")) {
    return ".pdf";
  }
  if (normalized.includes("text/plain")) {
    return ".txt";
  }
  if (normalized.includes("text/markdown") || normalized.includes("text/x-markdown")) {
    return ".md";
  }

  return null;
}

function inferRemoteFileName(url: URL, contentType: string | null): { fileName: string; extension: string } {
  const pathnameName = path.basename(url.pathname) || "download";
  const pathnameExtension = path.extname(pathnameName).toLowerCase();
  const extension = SUPPORTED_EXTENSIONS.has(pathnameExtension)
    ? pathnameExtension
    : contentTypeToExtension(contentType);

  if (!extension) {
    throw new Error("Remote URL does not appear to be a supported .pdf, .txt, or .md resource.");
  }

  const baseName = pathnameName.replace(/\.[^.]+$/, "") || "download";
  return {
    fileName: pathnameExtension === extension ? pathnameName : `${baseName}${extension}`,
    extension,
  };
}

async function assertSafeRemoteUrl(url: URL): Promise<void> {
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost")) {
    throw new Error("Refusing to fetch localhost URLs.");
  }

  if (net.isIP(hostname) && isPrivateIpAddress(hostname)) {
    throw new Error("Refusing to fetch private or loopback IP addresses.");
  }

  if (!net.isIP(hostname)) {
    const lookups = await dns.lookup(hostname, { all: true, verbatim: true });
    if (lookups.some((entry) => isPrivateIpAddress(entry.address))) {
      throw new Error("Refusing to fetch URLs that resolve to private or loopback IP addresses.");
    }
  }
}

async function fetchRemoteResponse(url: URL, signal: AbortSignal): Promise<Response> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
    await assertSafeRemoteUrl(currentUrl);

    const response = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal,
    });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new Error(`Remote paper request redirected without a location header (HTTP ${response.status}).`);
      }

      currentUrl = new URL(location, currentUrl);
      continue;
    }

    return response;
  }

  throw new Error("Too many redirects while downloading remote paper.");
}

async function loadRemoteInput(inputUrl: string): Promise<LoadedInput> {
  const url = new URL(inputUrl);
  await assertSafeRemoteUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_DOWNLOAD_TIMEOUT_MS);

  try {
    const response = await fetchRemoteResponse(url, controller.signal);

    if (!response.ok) {
      throw new Error(`Failed to download remote paper: HTTP ${response.status}`);
    }

    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? Number(contentLengthHeader) : null;
    if (contentLength !== null && Number.isFinite(contentLength) && contentLength > DEFAULT_MAX_DOWNLOAD_BYTES) {
      throw new Error(`Remote paper is too large (${contentLength} bytes). Max allowed is ${DEFAULT_MAX_DOWNLOAD_BYTES} bytes.`);
    }

    const contentType = response.headers.get("content-type");
    const finalUrl = new URL(response.url || url.toString());
    const { fileName, extension } = inferRemoteFileName(finalUrl, contentType);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.byteLength > DEFAULT_MAX_DOWNLOAD_BYTES) {
      throw new Error(`Remote paper is too large (${buffer.byteLength} bytes). Max allowed is ${DEFAULT_MAX_DOWNLOAD_BYTES} bytes.`);
    }

    return { fileName, extension, buffer };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Timed out downloading remote paper after ${DEFAULT_DOWNLOAD_TIMEOUT_MS}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function loadLocalInput(filePath: string): Promise<LoadedInput> {
  const absolutePath = path.resolve(filePath);
  const fileName = path.basename(absolutePath);
  const extension = path.extname(fileName).toLowerCase();

  if (!SUPPORTED_EXTENSIONS.has(extension)) {
    throw new Error(`Unsupported file type: ${extension}. Use .pdf, .txt, or .md`);
  }

  return {
    fileName,
    extension,
    buffer: await fs.readFile(absolutePath),
  };
}

export async function extractPaperText(filePathOrUrl: string, maxChars: number): Promise<ExtractedPaper> {
  const loaded = isRemoteHttpUrl(filePathOrUrl) ? await loadRemoteInput(filePathOrUrl) : await loadLocalInput(filePathOrUrl);

  let rawText = "";
  if (loaded.extension === ".pdf") {
    const result = await pdfParse(loaded.buffer);
    rawText = result.text;
  } else {
    rawText = loaded.buffer.toString("utf8");
  }

  const normalized = normalizeWhitespace(rawText);
  if (!normalized) {
    throw new Error(`No extractable text found in ${loaded.fileName}`);
  }

  const sections = parsePaperSections(normalized);

  return {
    fileName: loaded.fileName,
    rawText: normalized,
    text: buildPaperContext(sections, maxChars),
    sections,
  };
}
