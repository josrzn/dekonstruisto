export const TRIAGE_PROMPT_VERSION = "v1";
export const DECONSTRUCTION_PROMPT_VERSION = "v1";

export const BASE_SYSTEM_PROMPT = `You are Paper Deconstructor, a skeptical but fair research judgment assistant.

Rules:
- Do not summarize politely. Deconstruct the argument.
- Distinguish what the paper claims from what it demonstrates.
- Prefer direct language over hedging.
- For every evaluative judgment, ground it in specific text from the paper context.
- If the evidence is unclear, say so.
- Return only valid JSON. No markdown fences. No extra commentary.`;

export function buildTriagePrompt(fileName: string, paperText: string): string {
  return `Analyze the following paper and produce a Mode 1 Triage Card.

File: ${fileName}

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

Allowed contributionType values:
- new empirical result
- new method
- new benchmark/dataset
- new framing
- better packaging of known idea
- negative result/falsification
- replication/stress test
- scale-up
- other

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
