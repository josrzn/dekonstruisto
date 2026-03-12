import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { readCachedResult, writeCachedResult } from "../src/cache.js";

describe("cache", () => {
  let tempDir: string;
  const previousCacheDir = process.env.DEKONSTRUISTO_CACHE_DIR;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "dekonstruisto-cache-"));
    process.env.DEKONSTRUISTO_CACHE_DIR = tempDir;
  });

  afterEach(async () => {
    if (previousCacheDir === undefined) {
      delete process.env.DEKONSTRUISTO_CACHE_DIR;
    } else {
      process.env.DEKONSTRUISTO_CACHE_DIR = previousCacheDir;
    }

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("writes and reads cached results", async () => {
    const key = {
      command: "triage" as const,
      model: "test-model",
      promptVersion: "v1",
      paperText: "paper text",
    };

    await writeCachedResult(key, { value: 42, ok: true });
    const cached = await readCachedResult<{ value: number; ok: boolean }>(key);

    expect(cached).toEqual({ value: 42, ok: true });
  });

  it("returns null when cache miss is for different model", async () => {
    await writeCachedResult(
      {
        command: "triage",
        model: "model-a",
        promptVersion: "v1",
        paperText: "paper text",
      },
      { value: 1 },
    );

    const cached = await readCachedResult<{ value: number }>({
      command: "triage",
      model: "model-b",
      promptVersion: "v1",
      paperText: "paper text",
    });

    expect(cached).toBeNull();
  });

  it("returns null when cache miss is for different prompt version", async () => {
    await writeCachedResult(
      {
        command: "deconstruct",
        model: "model-a",
        promptVersion: "v1",
        paperText: "paper text",
      },
      { value: 1 },
    );

    const cached = await readCachedResult<{ value: number }>({
      command: "deconstruct",
      model: "model-a",
      promptVersion: "v2",
      paperText: "paper text",
    });

    expect(cached).toBeNull();
  });
});
