import {
  DeconstructionArchitecture,
  DeconstructionClaimMap,
  DeconstructionDecoder,
  DeconstructionResult,
  TriageExtraction,
  TriageResult,
} from "./types.js";

export const TRIAGE_EXTRACTION_PROMPT_VERSION = "v1";
export const TRIAGE_SYNTHESIS_PROMPT_VERSION = "v1";
export const TRIAGE_QUALITY_GATE_PROMPT_VERSION = "v1";
export const TRIAGE_CHAIN_VERSION = `chain-${TRIAGE_EXTRACTION_PROMPT_VERSION}-${TRIAGE_SYNTHESIS_PROMPT_VERSION}-${TRIAGE_QUALITY_GATE_PROMPT_VERSION}`;

export const DECONSTRUCTION_ARCHITECTURE_PROMPT_VERSION = "v1";
export const DECONSTRUCTION_DECODER_PROMPT_VERSION = "v1";
export const DECONSTRUCTION_CLAIM_MAP_PROMPT_VERSION = "v1";
export const DECONSTRUCTION_QUALITY_GATE_PROMPT_VERSION = "v1";
export const DECONSTRUCTION_CHAIN_VERSION = `chain-${DECONSTRUCTION_ARCHITECTURE_PROMPT_VERSION}-${DECONSTRUCTION_DECODER_PROMPT_VERSION}-${DECONSTRUCTION_CLAIM_MAP_PROMPT_VERSION}-${DECONSTRUCTION_QUALITY_GATE_PROMPT_VERSION}`;

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

export function buildDeconstructionArchitecturePrompt(fileName: string, paperText: string): string {
  return `Extract the hidden argument architecture of the following paper.

File: ${fileName}

You are in structure-extraction mode.
- Do not produce a full deconstruction yet.
- Reconstruct the paper's setup, method property, relevant data/world structure, and claimed implication.
- Identify which paper template best fits.
- Ground the architecture in 1 to 3 verbatim supporting passages.

Return JSON with exactly this shape:
{
  "title": string,
  "templateType": "artifact discovery" | "measurement paper" | "control method" | "benchmark paper" | "theoretical analysis" | "survey/position" | "other",
  "setup": string,
  "methodProperty": string,
  "dataStructure": string,
  "claimedImplication": string,
  "plainLanguageArchitecture": string,
  "supportingPassages": string[]
}

Paper text:
"""
${paperText}
"""`;
}

export function buildDeconstructionDecoderPrompt(fileName: string, paperText: string): string {
  return `Select and decode the densest or most revealing sentences from the following paper.

File: ${fileName}

You are in paper-decoder mode.
- Select 3 to 5 sentences that are both important and meaningfully compressed.
- Each original sentence must appear verbatim in the paper text.
- Prefer abstract, introduction, conclusion, or other structurally central sentences unless a method/results sentence is more revealing.
- Explain why each sentence matters to understanding the paper.

Return JSON with exactly this shape:
{
  "decoderRewrites": [
    {
      "original": string,
      "plainEnglish": string,
      "explanation": string,
      "whyThisSentenceMatters": string,
      "sectionGuess": "abstract" | "introduction" | "method" | "results" | "discussion" | "conclusion" | "unknown"
    }
  ]
}

Paper text:
"""
${paperText}
"""`;
}

export function buildDeconstructionClaimMapPrompt(fileName: string, paperText: string): string {
  return `Build a claim-evidence map for the following paper.

File: ${fileName}

You are in skeptical mapping mode.
- Extract 3 to 6 major claims only.
- For each claim, describe the evidence actually offered.
- Rate evidence strength based on support, not author confidence.
- Alternative explanations must be specific, not generic reviewer boilerplate.
- Every item must include a verbatim supporting passage.

Return JSON with exactly this shape:
{
  "claimEvidenceMap": [
    {
      "claim": string,
      "evidence": string,
      "evidenceType": "empirical" | "theoretical" | "analogical" | "authority-based" | "mixed",
      "strength": "strong" | "moderate" | "weak",
      "alternativeExplanation": string,
      "supportingPassage": string
    }
  ]
}

Paper text:
"""
${paperText}
"""`;
}

export function buildDeconstructionQualityGatePrompt(
  fileName: string,
  paperText: string,
  architecture: DeconstructionArchitecture,
  decoder: DeconstructionDecoder,
  claimMap: DeconstructionClaimMap,
  assembly: DeconstructionResult,
): string {
  return `Quality-check the deconstruction below for grounding, coherence, calibration, and fairness.

File: ${fileName}

You are acting as a strict but fair editor.
Check specifically:
- architectureGrounded: does the argument architecture reflect the paper text?
- architectureMatchesClaims: is the architecture consistent with the major claims in the claim-evidence map?
- decoderSelectionsCentral: are the chosen sentences central rather than arbitrary details?
- decoderRewritesFaithful: are the rewrites faithful to the original sentences?
- claimMapGrounded: are the claims/evidence/alternatives grounded in the paper text?
- strengthLabelsCalibrated: are strength labels fair and not systematically flattering or harsh?
- alternativeExplanationsSpecific: are alternative explanations specific rather than boilerplate?
- inventedContent: does the assembly invent content not supported by the paper or prior extraction steps?
- tooFlattering: does the result collapse into a polished explanation rather than a true deconstruction?
- tooCynical: is it unfairly harsh given the evidence?

If the deconstruction is acceptable, return verdict "pass" and omit revisedDeconstruction.
If it needs correction, return verdict "revise" and provide a full revisedDeconstruction object.

Return JSON with exactly this shape:
{
  "verdict": "pass" | "revise",
  "checks": {
    "architectureGrounded": boolean,
    "architectureMatchesClaims": boolean,
    "decoderSelectionsCentral": boolean,
    "decoderRewritesFaithful": boolean,
    "claimMapGrounded": boolean,
    "strengthLabelsCalibrated": boolean,
    "alternativeExplanationsSpecific": boolean,
    "inventedContent": boolean,
    "tooFlattering": boolean,
    "tooCynical": boolean
  },
  "issues": string[],
  "revisedDeconstruction": {
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
}

Extracted architecture:
${JSON.stringify(architecture, null, 2)}

Extracted decoder rewrites:
${JSON.stringify(decoder, null, 2)}

Extracted claim-evidence map:
${JSON.stringify(claimMap, null, 2)}

Candidate deconstruction:
${JSON.stringify(assembly, null, 2)}

Paper text:
"""
${paperText}
"""`;
}

export function buildDeconstructionAssembly(
  architecture: DeconstructionArchitecture,
  decoder: DeconstructionDecoder,
  claimMap: DeconstructionClaimMap,
): DeconstructionResult {
  return {
    title: architecture.title,
    argumentArchitecture: architecture.plainLanguageArchitecture,
    decoderRewrites: decoder.decoderRewrites.map((item) => ({
      original: item.original,
      plainEnglish: item.plainEnglish,
      explanation: item.explanation,
    })),
    claimEvidenceMap: claimMap.claimEvidenceMap.map((item) => ({
      claim: item.claim,
      evidence: item.evidence,
      evidenceType: item.evidenceType,
      strength: item.strength,
      alternativeExplanation: item.alternativeExplanation,
    })),
  };
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
