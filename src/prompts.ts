import { TriageExtraction, TriageResult } from "./types.js";

export const TRIAGE_EXTRACTION_PROMPT_VERSION = "v1";
export const TRIAGE_SYNTHESIS_PROMPT_VERSION = "v1";
export const TRIAGE_QUALITY_GATE_PROMPT_VERSION = "v1";
export const TRIAGE_CHAIN_VERSION = `chain-${TRIAGE_EXTRACTION_PROMPT_VERSION}-${TRIAGE_SYNTHESIS_PROMPT_VERSION}-${TRIAGE_QUALITY_GATE_PROMPT_VERSION}`;
export const DECONSTRUCTION_PROMPT_VERSION = "v1";

export const BASE_SYSTEM_PROMPT = `You are Paper Deconstructor, a skeptical but fair research judgment assistant.

Rules:
- Do not summarize politely. Deconstruct the argument.
- Distinguish what the paper claims from what it demonstrates.
- Prefer direct language over hedging.
- For every evaluative judgment, ground it in specific text from the paper context.
- If the evidence is unclear, say so.
- Return only valid JSON. No markdown fences. No extra commentary.`;

export function buildTriageExtractionPrompt(fileName: string, paperText: string): string {
  return `Extract the argument structure of the following paper for a later triage judgment step.

File: ${fileName}

You are in extraction mode, not evaluation mode.
- Do not recommend whether to read the paper.
- Do not praise or criticize the paper.
- Preserve ambiguity if the paper is vague.
- Every claim and evidence item must include a verbatim supporting passage from the paper text.
- Prefer claims that matter to the abstract, introduction, main results, or conclusion.

Return JSON with exactly this shape:
{
  "title": string,
  "coreClaims": [
    {
      "claim": string,
      "claimType": "headline" | "supporting" | "method" | "negative-result" | "framing",
      "supportingPassage": string
    }
  ],
  "evidenceItems": [
    {
      "evidence": string,
      "evidenceType": "empirical" | "theoretical" | "benchmark" | "ablation" | "analysis" | "mixed",
      "supportingPassage": string,
      "relatedClaims": string[]
    }
  ],
  "contributionSignals": {
    "candidateTypes": string[],
    "rationale": string
  },
  "mechanismSignals": {
    "biasOrMethod": string,
    "dataOrStructure": string,
    "claimedEffect": string,
    "whyAuthorsExpectIt": string
  }
}

Allowed contribution types:
- new empirical result
- new method
- new benchmark/dataset
- new framing
- better packaging of known idea
- negative result/falsification
- replication/stress test
- scale-up
- other

Requirements:
- Extract 3 to 6 coreClaims.
- Extract 3 to 6 evidenceItems.
- candidateTypes should contain 1 to 3 allowed contribution types.

Paper text:
"""
${paperText}
"""`;
}

export function buildTriageSynthesisPrompt(fileName: string, paperText: string, extraction: TriageExtraction): string {
  return `Use the extracted structure below to produce a final triage card for the paper.

File: ${fileName}

You are now in skeptical senior colleague mode.
- Distinguish what the paper claims from what it demonstrates.
- Use the extraction as your main scaffold.
- Ground strongestEvidence and weakestLink in specific passages.
- Do not default to a flattering summary.
- Do not become reflexively cynical.
- If evidence is thin, the recommendation should reflect that.

Return JSON with exactly this shape:
{
  "title": string,
  "oneLineThesis": string,
  "contributionType": string[],
  "mechanismDecomposition": {
    "biasOrMethod": string,
    "dataOrStructure": string,
    "claimedEffect": string,
    "whyAuthorsExpectIt": string
  },
  "strongestEvidence": {
    "summary": string,
    "supportingPassage": string
  },
  "weakestLink": {
    "summary": string,
    "supportingPassage": string
  },
  "investmentRecommendation": {
    "verdict": "Read Now" | "Skim Only" | "Save for Later" | "Skip Unless Directly Relevant",
    "justification": string
  }
}

Allowed contribution types:
- new empirical result
- new method
- new benchmark/dataset
- new framing
- better packaging of known idea
- negative result/falsification
- replication/stress test
- scale-up
- other

Extracted structure:
${JSON.stringify(extraction, null, 2)}

Paper text:
"""
${paperText}
"""`;
}

export function buildTriageQualityGatePrompt(
  fileName: string,
  paperText: string,
  extraction: TriageExtraction,
  synthesis: TriageResult,
): string {
  return `Quality-check the triage card below for grounding, calibration, and fairness.

File: ${fileName}

You are acting as a strict but fair editor.
Check specifically:
- grounded: are the evaluative judgments grounded in the paper text?
- contributionTypeConsistent: do the contribution labels fit the extracted claims and evidence?
- strongestEvidenceSupported: is the strongestEvidence actually well supported?
- weakestLinkSupported: is the weakestLink specific and justified rather than generic reviewer boilerplate?
- recommendationCalibrated: does the recommendation fit the evidence strength?
- tooFlattering: does the output collapse into a polite summary disguised as analysis?
- tooCynical: is it unfairly harsh given the available evidence?
- inventedClaims: does the synthesis introduce claims not grounded in the paper/extraction?

If the triage card is acceptable, return verdict "pass" and omit revisedTriage.
If it needs correction, return verdict "revise" and provide a full revisedTriage object.

Return JSON with exactly this shape:
{
  "verdict": "pass" | "revise",
  "checks": {
    "grounded": boolean,
    "contributionTypeConsistent": boolean,
    "strongestEvidenceSupported": boolean,
    "weakestLinkSupported": boolean,
    "recommendationCalibrated": boolean,
    "tooFlattering": boolean,
    "tooCynical": boolean,
    "inventedClaims": boolean
  },
  "issues": string[],
  "revisedTriage": {
    "title": string,
    "oneLineThesis": string,
    "contributionType": string[],
    "mechanismDecomposition": {
      "biasOrMethod": string,
      "dataOrStructure": string,
      "claimedEffect": string,
      "whyAuthorsExpectIt": string
    },
    "strongestEvidence": {
      "summary": string,
      "supportingPassage": string
    },
    "weakestLink": {
      "summary": string,
      "supportingPassage": string
    },
    "investmentRecommendation": {
      "verdict": "Read Now" | "Skim Only" | "Save for Later" | "Skip Unless Directly Relevant",
      "justification": string
    }
  }
}

Allowed contribution types:
- new empirical result
- new method
- new benchmark/dataset
- new framing
- better packaging of known idea
- negative result/falsification
- replication/stress test
- scale-up
- other

Extracted structure:
${JSON.stringify(extraction, null, 2)}

Candidate triage card:
${JSON.stringify(synthesis, null, 2)}

Paper text:
"""
${paperText}
"""`;
}

export function buildDeconstructionPrompt(fileName: string, paperText: string): string {
  return `Analyze the following paper and produce a minimal Mode 2 Deconstruction Report.

File: ${fileName}

Return JSON with exactly this shape:
{
  "title": string,
  "argumentArchitecture": string,
  "decoderRewrites": [
    {
      "original": string,
      "plainEnglish": string,
      "explanation": string
    }
  ],
  "claimEvidenceMap": [
    {
      "claim": string,
      "evidence": string,
      "evidenceType": "empirical" | "theoretical" | "analogical" | "authority-based" | "mixed",
      "strength": "strong" | "moderate" | "weak",
      "alternativeExplanation": string
    }
  ]
}

Requirements:
- argumentArchitecture should reconstruct the paper's hidden causal chain in plain language.
- decoderRewrites should include 3 to 5 dense or important sentences from the paper.
- claimEvidenceMap should include 3 to 6 major claims.
- Do not praise the paper unless the evidence clearly justifies it.

Paper text:
"""
${paperText}
"""`;
}

export function buildAskPrompt(fileName: string, paperText: string, question: string): string {
  return `Answer the user's question about this paper.

File: ${fileName}
Question: ${question}

Return JSON with exactly this shape:
{
  "answer": string,
  "citedPassages": string[],
  "confidence": "high" | "medium" | "low"
}

Requirements:
- Answer based only on the provided paper text.
- If the paper text is insufficient, say what is missing.
- citedPassages should include 1 to 3 verbatim snippets from the paper text.

Paper text:
"""
${paperText}
"""`;
}
