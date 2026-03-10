import { describe, expect, it, vi } from "vitest";
import type { TriageExtraction, TriageQualityGate, TriageResult } from "../src/types.js";

const generateStructuredOutput = vi.fn();

vi.mock("../src/llm.js", () => ({
  generateStructuredOutput,
}));

const { runTriageChain } = await import("../src/triage.js");

describe("runTriageChain", () => {
  it("returns synthesis when quality gate passes", async () => {
    const extraction: TriageExtraction = {
      title: "Example",
      coreClaims: [{ claim: "Main claim", claimType: "headline", supportingPassage: "We show main claim." }],
      evidenceItems: [
        {
          evidence: "Main experiment",
          evidenceType: "empirical",
          supportingPassage: "Table 1 shows...",
          relatedClaims: ["Main claim"],
        },
      ],
      contributionSignals: {
        candidateTypes: ["new method"],
        rationale: "Introduces a new protocol.",
      },
      mechanismSignals: {
        biasOrMethod: "Sparse method bias",
        dataOrStructure: "Simple cues",
        claimedEffect: "Features fire on cues",
        whyAuthorsExpectIt: "Simple signals are easier to isolate",
      },
    };

    const synthesis: TriageResult = {
      title: "Example",
      oneLineThesis: "This paper argues X.",
      contributionType: ["new method"],
      mechanismDecomposition: {
        biasOrMethod: "Sparse method bias",
        dataOrStructure: "Simple cues",
        claimedEffect: "Features fire on cues",
        whyAuthorsExpectIt: "Simple signals are easier to isolate",
      },
      strongestEvidence: {
        summary: "Table 1 is the strongest evidence.",
        supportingPassage: "Table 1 shows...",
      },
      weakestLink: {
        summary: "Only small models are tested.",
        supportingPassage: "We only test small models.",
      },
      investmentRecommendation: {
        verdict: "Skim Only",
        justification: "Interesting but limited.",
      },
    };

    const gate: TriageQualityGate = {
      verdict: "pass",
      checks: {
        grounded: true,
        contributionTypeConsistent: true,
        strongestEvidenceSupported: true,
        weakestLinkSupported: true,
        recommendationCalibrated: true,
        tooFlattering: false,
        tooCynical: false,
        inventedClaims: false,
      },
      issues: [],
    };

    generateStructuredOutput.mockResolvedValueOnce(extraction).mockResolvedValueOnce(synthesis).mockResolvedValueOnce(gate);

    const spinner = { update: vi.fn() };
    const result = await runTriageChain("paper.pdf", "paper text", spinner as never);

    expect(result.finalResult).toEqual(synthesis);
    expect(result.extraction).toEqual(extraction);
    expect(result.qualityGate).toEqual(gate);
    expect(spinner.update).toHaveBeenCalledTimes(3);
  });

  it("returns revised triage when quality gate requests revision", async () => {
    const extraction = {
      title: "Example",
      coreClaims: [{ claim: "Main claim", claimType: "headline", supportingPassage: "We show main claim." }],
      evidenceItems: [],
      contributionSignals: { candidateTypes: ["new method"], rationale: "reason" },
      mechanismSignals: {
        biasOrMethod: "bias",
        dataOrStructure: "data",
        claimedEffect: "effect",
        whyAuthorsExpectIt: "why",
      },
    } satisfies TriageExtraction;

    const synthesis = {
      title: "Example",
      oneLineThesis: "Old thesis",
      contributionType: ["new method"],
      mechanismDecomposition: {
        biasOrMethod: "bias",
        dataOrStructure: "data",
        claimedEffect: "effect",
        whyAuthorsExpectIt: "why",
      },
      strongestEvidence: { summary: "old", supportingPassage: "passage" },
      weakestLink: { summary: "weak", supportingPassage: "passage" },
      investmentRecommendation: { verdict: "Read Now", justification: "too strong" },
    } satisfies TriageResult;

    const revised = {
      ...synthesis,
      investmentRecommendation: { verdict: "Skim Only", justification: "better calibrated" },
    } satisfies TriageResult;

    generateStructuredOutput
      .mockResolvedValueOnce(extraction)
      .mockResolvedValueOnce(synthesis)
      .mockResolvedValueOnce({
        verdict: "revise",
        checks: {
          grounded: true,
          contributionTypeConsistent: true,
          strongestEvidenceSupported: true,
          weakestLinkSupported: true,
          recommendationCalibrated: false,
          tooFlattering: false,
          tooCynical: false,
          inventedClaims: false,
        },
        issues: ["Recommendation too strong."],
        revisedTriage: revised,
      } satisfies TriageQualityGate);

    const result = await runTriageChain("paper.pdf", "paper text");
    expect(result.finalResult).toEqual(revised);
  });
});
