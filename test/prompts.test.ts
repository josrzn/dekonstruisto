import { describe, expect, it } from "vitest";
import { buildAskPrompt } from "../src/prompts.js";
import type { DeconstructionResult, TriageResult } from "../src/types.js";

describe("buildAskPrompt", () => {
  it("includes cached triage and deconstruction context when provided", () => {
    const triage: TriageResult = {
      title: "Example",
      oneLineThesis: "Paper argues X.",
      contributionType: ["new method"],
      mechanismDecomposition: {
        biasOrMethod: "bias",
        dataOrStructure: "data",
        claimedEffect: "effect",
        whyAuthorsExpectIt: "why",
      },
      strongestEvidence: { summary: "strong", supportingPassage: "passage" },
      weakestLink: { summary: "weak", supportingPassage: "passage" },
      investmentRecommendation: { verdict: "Skim Only", justification: "limited" },
    };

    const deconstruction: DeconstructionResult = {
      title: "Example",
      argumentArchitecture: "architecture",
      decoderRewrites: [{ original: "orig", plainEnglish: "plain", explanation: "exp" }],
      claimEvidenceMap: [
        {
          claim: "claim",
          evidence: "evidence",
          evidenceType: "empirical",
          strength: "moderate",
          alternativeExplanation: "alt",
        },
      ],
    };

    const prompt = buildAskPrompt("paper.pdf", "paper text", "What is novel here?", {
      triage,
      deconstruction,
    });

    expect(prompt).toContain("Cached structured context");
    expect(prompt).toContain("Paper argues X.");
    expect(prompt).toContain("architecture");
    expect(prompt).toContain("paper text remains the source of truth");
  });
});
