import { describe, expect, it } from "vitest";
import { renderDeconstruction, renderTriage } from "../src/format.js";
import { DeconstructionResult, TriageResult } from "../src/types.js";

const triage: TriageResult = {
  title: "Example Paper",
  oneLineThesis: "The paper argues that cue tokens explain most of the effect.",
  contributionType: ["negative result/falsification", "new method"],
  mechanismDecomposition: {
    biasOrMethod: "Sparse methods prefer simple signals.",
    dataOrStructure: "Cue tokens are easier to isolate than reasoning traces.",
    claimedEffect: "Candidate reasoning features fire on cues.",
    whyAuthorsExpectIt: "Simple repeated signals are easier to capture.",
  },
  strongestEvidence: {
    summary: "Cue injection recreates feature activations.",
    supportingPassage: "Injecting cue tokens activates many candidate features.",
  },
  weakestLink: {
    summary: "Only small models are evaluated.",
    supportingPassage: "We only evaluate small models.",
  },
  investmentRecommendation: {
    verdict: "Read Now",
    justification: "Worth reading if you work on interpretability.",
  },
};

const deconstruction: DeconstructionResult = {
  title: "Example Paper",
  argumentArchitecture:
    "Because sparse methods prefer simple repeated signals, they may isolate cues before true reasoning structure.",
  decoderRewrites: [
    {
      original: "Candidate reasoning features preferentially respond to low-dimensional correlates.",
      plainEnglish: "The features mostly react to simple clues.",
      explanation: "Low-dimensional correlates means simple repeated signals.",
    },
  ],
  claimEvidenceMap: [
    {
      claim: "Reasoning features detect cues.",
      evidence: "Cue token injection activates many candidate features.",
      evidenceType: "empirical",
      strength: "moderate",
      alternativeExplanation: "Cue tokens may recreate broader context.",
    },
  ],
};

describe("format renderers", () => {
  it("renders triage pretty output with main sections", () => {
    const output = renderTriage(triage, { format: "pretty", color: false, width: 80 });

    expect(output).toContain("Example Paper");
    expect(output).toContain("Triage Card");
    expect(output).toContain("Strongest Evidence");
    expect(output).toContain("Recommendation");
  });

  it("renders triage compact output densely", () => {
    const output = renderTriage(triage, { format: "pretty", color: false, width: 80, compact: true });

    expect(output).toContain("Thesis:");
    expect(output).toContain("Type:");
    expect(output).toContain("Recommendation:");
    expect(output).not.toContain("┌─ Triage Card");
  });

  it("renders deconstruction markdown", () => {
    const output = renderDeconstruction(deconstruction, { format: "markdown" });

    expect(output).toContain("## Argument Architecture");
    expect(output).toContain("## Paper Decoder Rewrites");
    expect(output).toContain("## Claim-Evidence Map");
  });

  it("renders triage json", () => {
    const output = renderTriage(triage, { format: "json" });
    expect(JSON.parse(output)).toEqual(triage);
  });
});
