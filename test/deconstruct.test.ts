import { describe, expect, it, vi } from "vitest";
import type {
  DeconstructionArchitecture,
  DeconstructionClaimMap,
  DeconstructionDecoder,
  DeconstructionQualityGate,
  DeconstructionResult,
} from "../src/types.js";

const generateStructuredOutput = vi.fn();

vi.mock("../src/llm.js", () => ({
  generateStructuredOutput,
}));

const { runDeconstructionChain } = await import("../src/deconstruct.js");

describe("runDeconstructionChain", () => {
  it("returns assembled deconstruction when quality gate passes", async () => {
    const architecture: DeconstructionArchitecture = {
      title: "Example",
      templateType: "measurement paper",
      setup: "Tests whether features track reasoning.",
      methodProperty: "Sparse methods isolate simple signals.",
      dataStructure: "Cue tokens are easier to isolate than reasoning traces.",
      claimedImplication: "Apparent reasoning features may be cue detectors.",
      plainLanguageArchitecture:
        "Because sparse methods prefer simple repeated signals, they may isolate cues before true reasoning structure.",
      supportingPassages: ["We test whether candidate reasoning features respond to cue tokens."],
    };

    const decoder: DeconstructionDecoder = {
      decoderRewrites: [
        {
          original: "Candidate reasoning features preferentially respond to low-dimensional correlates.",
          plainEnglish: "The features mostly react to simple clues.",
          explanation: "Low-dimensional correlates means simple repeated signals.",
          whyThisSentenceMatters: "It states the main mechanistic interpretation.",
          sectionGuess: "abstract",
        },
      ],
    };

    const claimMap: DeconstructionClaimMap = {
      claimEvidenceMap: [
        {
          claim: "Reasoning features detect cues.",
          evidence: "Cue token injection activates many candidate features.",
          evidenceType: "empirical",
          strength: "moderate",
          alternativeExplanation: "Cue tokens may recreate broader context.",
          supportingPassage: "Injecting cue tokens activates many candidate features.",
        },
      ],
    };

    const gate: DeconstructionQualityGate = {
      verdict: "pass",
      checks: {
        architectureGrounded: true,
        architectureMatchesClaims: true,
        decoderSelectionsCentral: true,
        decoderRewritesFaithful: true,
        claimMapGrounded: true,
        strengthLabelsCalibrated: true,
        alternativeExplanationsSpecific: true,
        inventedContent: false,
        tooFlattering: false,
        tooCynical: false,
      },
      issues: [],
    };

    generateStructuredOutput
      .mockResolvedValueOnce(architecture)
      .mockResolvedValueOnce(decoder)
      .mockResolvedValueOnce(claimMap)
      .mockResolvedValueOnce(gate);

    const spinner = { update: vi.fn() };
    const result = await runDeconstructionChain("paper.pdf", "paper text", spinner as never);

    expect(result.finalResult.title).toBe("Example");
    expect(result.finalResult.argumentArchitecture).toBe(architecture.plainLanguageArchitecture);
    expect(result.finalResult.decoderRewrites).toHaveLength(1);
    expect(result.finalResult.claimEvidenceMap).toHaveLength(1);
    expect(spinner.update).toHaveBeenCalledTimes(4);
  });

  it("returns revised deconstruction when quality gate requests revision", async () => {
    const architecture = {
      title: "Example",
      templateType: "measurement paper",
      setup: "setup",
      methodProperty: "property",
      dataStructure: "data",
      claimedImplication: "implication",
      plainLanguageArchitecture: "assembly architecture",
      supportingPassages: ["passage"],
    } satisfies DeconstructionArchitecture;

    const decoder = {
      decoderRewrites: [
        {
          original: "orig",
          plainEnglish: "plain",
          explanation: "exp",
          whyThisSentenceMatters: "matters",
          sectionGuess: "abstract",
        },
      ],
    } satisfies DeconstructionDecoder;

    const claimMap = {
      claimEvidenceMap: [
        {
          claim: "claim",
          evidence: "evidence",
          evidenceType: "empirical",
          strength: "weak",
          alternativeExplanation: "alt",
          supportingPassage: "passage",
        },
      ],
    } satisfies DeconstructionClaimMap;

    const revised: DeconstructionResult = {
      title: "Example",
      argumentArchitecture: "revised architecture",
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

    generateStructuredOutput
      .mockResolvedValueOnce(architecture)
      .mockResolvedValueOnce(decoder)
      .mockResolvedValueOnce(claimMap)
      .mockResolvedValueOnce({
        verdict: "revise",
        checks: {
          architectureGrounded: true,
          architectureMatchesClaims: true,
          decoderSelectionsCentral: true,
          decoderRewritesFaithful: true,
          claimMapGrounded: true,
          strengthLabelsCalibrated: false,
          alternativeExplanationsSpecific: true,
          inventedContent: false,
          tooFlattering: false,
          tooCynical: false,
        },
        issues: ["Strength label too harsh."],
        revisedDeconstruction: revised,
      } satisfies DeconstructionQualityGate);

    const result = await runDeconstructionChain("paper.pdf", "paper text");
    expect(result.finalResult).toEqual(revised);
  });
});
