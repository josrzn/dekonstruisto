import { AskResult, DeconstructionResult, TriageResult } from "./types.js";

export function formatTriageMarkdown(result: TriageResult): string {
  return `# ${result.title || "Untitled Paper"}

## Triage Card

**One-Line Thesis**  
${result.oneLineThesis}

**Contribution Type**  
${result.contributionType.join(", ")}

**Mechanism Decomposition**
- **Bias / Method:** ${result.mechanismDecomposition.biasOrMethod}
- **Data / Structure:** ${result.mechanismDecomposition.dataOrStructure}
- **Claimed Effect:** ${result.mechanismDecomposition.claimedEffect}
- **Why Authors Expect It:** ${result.mechanismDecomposition.whyAuthorsExpectIt}

**Strongest Evidence**  
${result.strongestEvidence.summary}

> ${result.strongestEvidence.supportingPassage}

**Weakest Link**  
${result.weakestLink.summary}

> ${result.weakestLink.supportingPassage}

**Investment Recommendation**  
**${result.investmentRecommendation.verdict}** — ${result.investmentRecommendation.justification}
`;
}

export function formatDeconstructionMarkdown(result: DeconstructionResult): string {
  const rewrites = result.decoderRewrites
    .map(
      (item, index) => `### Rewrite ${index + 1}
**Original**  
${item.original}

**Plain English**  
${item.plainEnglish}

**What it really means**  
${item.explanation}`,
    )
    .join("\n\n");

  const claimMap = result.claimEvidenceMap
    .map(
      (item, index) => `### Claim ${index + 1}
- **Claim:** ${item.claim}
- **Evidence:** ${item.evidence}
- **Evidence Type:** ${item.evidenceType}
- **Strength:** ${item.strength}
- **Alternative Explanation:** ${item.alternativeExplanation}`,
    )
    .join("\n\n");

  return `# ${result.title || "Untitled Paper"}

## Argument Architecture
${result.argumentArchitecture}

## Paper Decoder Rewrites
${rewrites}

## Claim-Evidence Map
${claimMap}
`;
}

export function formatAskMarkdown(question: string, result: AskResult): string {
  const passages = result.citedPassages.map((passage) => `> ${passage}`).join("\n\n");

  return `# Follow-up Question

**Question**  
${question}

**Answer**  
${result.answer}

**Confidence**  
${result.confidence}

## Cited Passages
${passages}`;
}
