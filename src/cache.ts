import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export type CacheCommand = "triage" | "deconstruct";

interface CacheKeyInput {
  command: CacheCommand;
  model: string;
  promptVersion: string;
  paperText: string;
}

interface CacheEnvelope<T> {
  cacheVersion: string;
  createdAt: string;
  command: CacheCommand;
  model: string;
  promptVersion: string;
  paperTextHash: string;
  result: T;
}

const CACHE_VERSION = "v1";

function getCacheDir(): string {
  return path.resolve(process.env.PAPER_DECONSTRUCTOR_CACHE_DIR || ".paper-deconstructor-cache");
}

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function getPaperTextHash(paperText: string): string {
  return sha256(paperText);
}

function getCacheKey(input: CacheKeyInput): string {
  return sha256(
    JSON.stringify({
      cacheVersion: CACHE_VERSION,
      command: input.command,
      model: input.model,
      promptVersion: input.promptVersion,
      paperTextHash: getPaperTextHash(input.paperText),
    }),
  );
}

function getCachePath(key: string): string {
  return path.join(getCacheDir(), `${key}.json`);
}

export async function readCachedResult<T>(input: CacheKeyInput): Promise<T | null> {
  const key = getCacheKey(input);
  const cachePath = getCachePath(key);

  try {
    const raw = await fs.readFile(cachePath, "utf8");
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;

    if (envelope.cacheVersion !== CACHE_VERSION) {
      return null;
    }

    return envelope.result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("ENOENT")) {
      return null;
    }
    return null;
  }
}

export async function writeCachedResult<T>(input: CacheKeyInput, result: T): Promise<void> {
  const key = getCacheKey(input);
  const cachePath = getCachePath(key);
  const envelope: CacheEnvelope<T> = {
    cacheVersion: CACHE_VERSION,
    createdAt: new Date().toISOString(),
    command: input.command,
    model: input.model,
    promptVersion: input.promptVersion,
    paperTextHash: getPaperTextHash(input.paperText),
    result,
  };

  await fs.mkdir(getCacheDir(), { recursive: true });
  await fs.writeFile(cachePath, JSON.stringify(envelope, null, 2), "utf8");
}
