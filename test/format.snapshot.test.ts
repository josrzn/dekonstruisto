import { describe, expect, it } from "vitest";
import {
  renderDeconstruction,
  renderDeconstructionDebug,
  renderTriage,
  renderTriageDebug,
} from "../src/format.js";
import type {
  DeconstructionChainArtifacts,
  DeconstructionResult,
  TriageChainArtifacts,
  TriageResult,
} from "../src/types.js";

const triage: TriageResult = {
  title: "Example Paper",
  oneLineThesis: "The paper argues that cue tokens explain most of the observed effect.",
  contributionType: ["negative result/falsification", "new method"],
  mechanismDecomposition: {
    biasOrMethod: "Sparse methods prefer simple repeated signals.",
    dataOrStructure: "Cue tokens are easier to isolate than distributed reasoning traces.",
    claimedEffect: "Candidate reasoning features fire on cues instead of reasoning.",
    whyAuthorsExpectIt: "Simple repeated signals are easier to capture than messy latent structure.",
  },
  strongestEvidence: {
    summary: "Cue injection recreates many reported feature activations.",
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

const triageDebug: TriageChainArtifacts = {
  extraction: {
    title: "Example Paper",
    coreClaims: [{ claim: "Main claim", claimType: "headline", supportingPassage: "We show the main claim." }],
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
      rationale: "Introduces a new evaluation protocol.",
    },
    mechanismSignals: {
      biasOrMethod: "Sparse method bias",
      dataOrStructure: "Simple cues",
      claimedEffect: "Features fire on cues",
      whyAuthorsExpectIt: "Simple signals are easier to isolate",
    },
  },
  synthesis: triage,
  qualityGate: {
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
  },
  finalResult: triage,
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

const deconstructionDebug: DeconstructionChainArtifacts = {
  architecture: {
    title: "Example Paper",
    templateType: "measurement paper",
    setup: "Tests whether features track reasoning.",
    methodProperty: "Sparse methods isolate simple signals.",
    dataStructure: "Cue tokens are easier to isolate than reasoning traces.",
    claimedImplication: "Apparent reasoning features may be cue detectors.",
    plainLanguageArchitecture:
      "Because sparse methods prefer simple repeated signals, they may isolate cues before true reasoning structure.",
    supportingPassages: ["We test whether candidate reasoning features respond to cue tokens."],
  },
  decoder: {
    decoderRewrites: [
      {
        original: "Candidate reasoning features preferentially respond to low-dimensional correlates.",
        plainEnglish: "The features mostly react to simple clues.",
        explanation: "Low-dimensional correlates means simple repeated signals.",
        whyThisSentenceMatters: "It states the paper's main mechanistic interpretation.",
        sectionGuess: "abstract",
      },
    ],
  },
  claimMap: {
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
  },
  assembly: deconstruction,
  qualityGate: {
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
  },
  finalResult: deconstruction,
};

describe("format snapshots", () => {
  it("matches triage pretty snapshot", () => {
    expect(renderTriage(triage, { format: "pretty", color: false, width: 80 })).toMatchSnapshot();
  });

  it("matches triage compact snapshot", () => {
    expect(renderTriage(triage, { format: "pretty", color: false, width: 80, compact: true })).toMatchSnapshot();
  });

  it("matches triage markdown snapshot", () => {
    expect(renderTriage(triage, { format: "markdown" })).toMatchSnapshot();
  });

  it("matches triage debug pretty snapshot", () => {
    expect(renderTriageDebug(triageDebug, { format: "pretty", color: false, width: 88 })).toMatchSnapshot();
  });

  it("matches triage debug compact snapshot", () => {
    expect(renderTriageDebug(triageDebug, { format: "pretty", color: false, width: 88, compact: true })).toMatchSnapshot();
  });

  it("matches deconstruction pretty snapshot", () => {
    expect(renderDeconstruction(deconstruction, { format: "pretty", color: false, width: 88 })).toMatchSnapshot();
  });

  it("matches deconstruction compact snapshot", () => {
    expect(renderDeconstruction(deconstruction, { format: "pretty", color: false, width: 88, compact: true })).toMatchSnapshot();
  });

  it("matches deconstruction markdown snapshot", () => {
    expect(renderDeconstruction(deconstruction, { format: "markdown" })).toMatchSnapshot();
  });

  it("matches deconstruction debug pretty snapshot", () => {
    expect(renderDeconstructionDebug(deconstructionDebug, { format: "pretty", color: false, width: 88 })).toMatchSnapshot();
  });

  it("matches deconstruction debug compact snapshot", () => {
    expect(renderDeconstructionDebug(deconstructionDebug, { format: "pretty", color: false, width: 88, compact: true })).toMatchSnapshot();
  });
});
