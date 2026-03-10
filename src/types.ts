export type ContributionType =
  | "new empirical result"
  | "new method"
  | "new benchmark/dataset"
  | "new framing"
  | "better packaging of known idea"
  | "negative result/falsification"
  | "replication/stress test"
  | "scale-up"
  | "other";

export interface TriageResult {
  title: string;
  oneLineThesis: string;
  contributionType: ContributionType[];
  mechanismDecomposition: {
    biasOrMethod: string;
    dataOrStructure: string;
    claimedEffect: string;
    whyAuthorsExpectIt: string;
  };
  strongestEvidence: {
    summary: string;
    supportingPassage: string;
  };
  weakestLink: {
    summary: string;
    supportingPassage: string;
  };
  investmentRecommendation: {
    verdict: "Read Now" | "Skim Only" | "Save for Later" | "Skip Unless Directly Relevant";
    justification: string;
  };
}

export interface TriageExtraction {
  title: string;
  coreClaims: Array<{
    claim: string;
    claimType: "headline" | "supporting" | "method" | "negative-result" | "framing";
    supportingPassage: string;
  }>;
  evidenceItems: Array<{
    evidence: string;
    evidenceType: "empirical" | "theoretical" | "benchmark" | "ablation" | "analysis" | "mixed";
    supportingPassage: string;
    relatedClaims: string[];
  }>;
  contributionSignals: {
    candidateTypes: ContributionType[];
    rationale: string;
  };
  mechanismSignals: {
    biasOrMethod: string;
    dataOrStructure: string;
    claimedEffect: string;
    whyAuthorsExpectIt: string;
  };
}

export interface TriageQualityGate {
  verdict: "pass" | "revise";
  checks: {
    grounded: boolean;
    contributionTypeConsistent: boolean;
    strongestEvidenceSupported: boolean;
    weakestLinkSupported: boolean;
    recommendationCalibrated: boolean;
    tooFlattering: boolean;
    tooCynical: boolean;
    inventedClaims: boolean;
  };
  issues: string[];
  revisedTriage?: TriageResult;
}

export interface DecoderRewrite {
  original: string;
  plainEnglish: string;
  explanation: string;
}

export interface ClaimEvidenceItem {
  claim: string;
  evidence: string;
  evidenceType: "empirical" | "theoretical" | "analogical" | "authority-based" | "mixed";
  strength: "strong" | "moderate" | "weak";
  alternativeExplanation: string;
}

export interface DeconstructionResult {
  title: string;
  argumentArchitecture: string;
  decoderRewrites: DecoderRewrite[];
  claimEvidenceMap: ClaimEvidenceItem[];
}

export interface AskResult {
  answer: string;
  citedPassages: string[];
  confidence: "high" | "medium" | "low";
}
