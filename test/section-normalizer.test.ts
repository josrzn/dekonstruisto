import { describe, expect, it } from "vitest";
import { buildSectionNormalizationPrompt } from "../src/prompts.js";
import { mergeNormalizedSections } from "../src/section-normalizer.js";
import type { PaperSections } from "../src/pdf.js";

describe("section normalizer", () => {
  it("builds a prompt that includes heuristic guess and raw text", () => {
    const heuristic: PaperSections = {
      title: "Heuristic Title",
      abstract: "Heuristic abstract",
      introduction: "Heuristic intro",
      conclusion: "Heuristic conclusion",
      body: "Heuristic body",
    };

    const prompt = buildSectionNormalizationPrompt("paper.pdf", "Raw extracted text", heuristic);

    expect(prompt).toContain("document-structure normalization mode");
    expect(prompt).toContain("Heuristic section guess");
    expect(prompt).toContain("Raw extracted text");
    expect(prompt).toContain("Heuristic Title");
    expect(prompt).toContain("Raw extracted text:");
    expect(prompt).toContain("\"\"\"\nRaw extracted text\n\"\"\"");
  });

  it("merges normalized sections with heuristic fallbacks", () => {
    const heuristic: PaperSections = {
      title: "Heuristic Title",
      abstract: "Heuristic abstract",
      introduction: "Heuristic intro",
      conclusion: "Heuristic conclusion",
      body: "Heuristic body",
    };

    const merged = mergeNormalizedSections(heuristic, {
      title: "Model Title",
      abstract: null,
      introduction: "Model intro",
      conclusion: null,
      body: "Model body",
      referencesDetected: true,
      notes: ["Dropped references"],
    });

    expect(merged).toEqual({
      title: "Model Title",
      abstract: "Heuristic abstract",
      introduction: "Model intro",
      conclusion: "Heuristic conclusion",
      body: "Model body",
    });
  });
});
