import { AskResult, DeconstructionResult, TriageResult } from "./types.js";

export type OutputFormat = "pretty" | "markdown" | "json";

interface RenderOptions {
  format: OutputFormat;
  color?: boolean;
  width?: number;
  compact?: boolean;
}

interface Styler {
  bold: (value: string) => string;
  dim: (value: string) => string;
  cyan: (value: string) => string;
  yellow: (value: string) => string;
  green: (value: string) => string;
  red: (value: string) => string;
  magenta: (value: string) => string;
}

function createStyler(enabled: boolean): Styler {
  const apply = (code: string) => (value: string) => (enabled ? `\u001b[${code}m${value}\u001b[0m` : value);

  return {
    bold: apply("1"),
    dim: apply("2"),
    cyan: apply("36"),
    yellow: apply("33"),
    green: apply("32"),
    red: apply("31"),
    magenta: apply("35"),
  };
}

function normalizeInline(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function wrapWithPrefix(text: string, width: number, firstPrefix = "", restPrefix = firstPrefix): string {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => normalizeInline(paragraph)).filter(Boolean);

  if (paragraphs.length === 0) {
    return firstPrefix.trimEnd();
  }

  return paragraphs
    .map((paragraph, paragraphIndex) => {
      const words = paragraph.split(" ");
      const lines: string[] = [];
      let current = paragraphIndex === 0 ? firstPrefix : restPrefix;
      const firstLinePrefix = paragraphIndex === 0 ? firstPrefix : restPrefix;
      let currentPrefix = firstLinePrefix;

      for (const word of words) {
        const candidate = current.trim().length === currentPrefix.trim().length ? `${current}${word}` : `${current} ${word}`;

        if (candidate.length <= width || current.trim().length === currentPrefix.trim().length) {
          current = candidate;
        } else {
          lines.push(current);
          currentPrefix = restPrefix;
          current = `${restPrefix}${word}`;
        }
      }

      lines.push(current);
      return lines.join("\n");
    })
    .join("\n\n");
}

function wrapBlock(text: string, width: number, indent = 2): string {
  return wrapWithPrefix(text, width, " ".repeat(indent), " ".repeat(indent));
}

function wrapBullet(text: string, width: number, indent = 2): string {
  const firstPrefix = `${" ".repeat(indent)}- `;
  const restPrefix = " ".repeat(firstPrefix.length);
  return wrapWithPrefix(text, width, firstPrefix, restPrefix);
}

function section(title: string, width: number, style: Styler): string {
  const plainLine = "-".repeat(Math.min(Math.max(title.length, 12), Math.max(12, width)));
  return `${style.bold(style.cyan(title))}\n${style.dim(plainLine)}`;
}

function subheading(title: string, style: Styler): string {
  return style.bold(title);
}

function formatVerdict(verdict: TriageResult["investmentRecommendation"]["verdict"], style: Styler): string {
  if (verdict === "Read Now") {
    return style.green(verdict.toUpperCase());
  }
  if (verdict === "Skip Unless Directly Relevant") {
    return style.red(verdict.toUpperCase());
  }
  if (verdict === "Skim Only") {
    return style.yellow(verdict.toUpperCase());
  }
  return style.magenta(verdict.toUpperCase());
}

function formatStrength(strength: "strong" | "moderate" | "weak", style: Styler): string {
  if (strength === "strong") {
    return style.green(strength);
  }
  if (strength === "weak") {
    return style.red(strength);
  }
  return style.yellow(strength);
}

function formatTriagePretty(result: TriageResult, width: number, color: boolean, compact: boolean): string {
  const style = createStyler(color);
  const title = result.title || "Untitled Paper";

  if (compact) {
    return [
      style.bold(title),
      style.dim("=".repeat(Math.min(title.length, width))),
      wrapBlock(`Thesis: ${result.oneLineThesis}`, width, 0),
      wrapBlock(`Type: ${result.contributionType.join(", ")}`, width, 0),
      wrapBlock(
        `Mechanism: Bias/Method=${result.mechanismDecomposition.biasOrMethod}; Data/Structure=${result.mechanismDecomposition.dataOrStructure}; Claimed Effect=${result.mechanismDecomposition.claimedEffect}; Why=${result.mechanismDecomposition.whyAuthorsExpectIt}`,
        width,
        0,
      ),
      wrapBlock(`Strongest evidence: ${result.strongestEvidence.summary}`, width, 0),
      wrapBlock(`  Passage: ${result.strongestEvidence.supportingPassage}`, width, 0),
      wrapBlock(`Weakest link: ${result.weakestLink.summary}`, width, 0),
      wrapBlock(`  Passage: ${result.weakestLink.supportingPassage}`, width, 0),
      wrapBlock(`Recommendation: ${formatVerdict(result.investmentRecommendation.verdict, style)} — ${result.investmentRecommendation.justification}`, width, 0),
    ].join("\n");
  }

  return [
    style.bold(title),
    style.dim("=".repeat(Math.min(title.length, width))),
    "",
    section("Triage Card", width, style),
    "",
    subheading("One-line thesis", style),
    wrapBlock(result.oneLineThesis, width),
    "",
    subheading("Contribution type", style),
    result.contributionType.map((item) => wrapBullet(item, width)).join("\n"),
    "",
    subheading("Mechanism decomposition", style),
    wrapBlock(`Bias / Method: ${result.mechanismDecomposition.biasOrMethod}`, width),
    wrapBlock(`Data / Structure: ${result.mechanismDecomposition.dataOrStructure}`, width),
    wrapBlock(`Claimed Effect: ${result.mechanismDecomposition.claimedEffect}`, width),
    wrapBlock(`Why Authors Expect It: ${result.mechanismDecomposition.whyAuthorsExpectIt}`, width),
    "",
    subheading("Strongest evidence", style),
    wrapBlock(result.strongestEvidence.summary, width),
    wrapBlock(`Passage: ${result.strongestEvidence.supportingPassage}`, width, 4),
    "",
    subheading("Weakest link", style),
    wrapBlock(result.weakestLink.summary, width),
    wrapBlock(`Passage: ${result.weakestLink.supportingPassage}`, width, 4),
    "",
    subheading("Recommendation", style),
    wrapBlock(formatVerdict(result.investmentRecommendation.verdict, style), width),
    wrapBlock(result.investmentRecommendation.justification, width),
  ].join("\n");
}

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

function formatDeconstructionPretty(result: DeconstructionResult, width: number, color: boolean, compact: boolean): string {
  const style = createStyler(color);
  const title = result.title || "Untitled Paper";

  if (compact) {
    const rewritesCompact = result.decoderRewrites.flatMap((item, index) => [
      wrapBlock(`Rewrite ${index + 1}: ${item.original}`, width, 0),
      wrapBlock(`  Plain English: ${item.plainEnglish}`, width, 0),
      wrapBlock(`  Meaning: ${item.explanation}`, width, 0),
    ]);

    const claimMapCompact = result.claimEvidenceMap.flatMap((item, index) => [
      wrapBlock(`Claim ${index + 1}: ${item.claim}`, width, 0),
      wrapBlock(`  Evidence: ${item.evidence}`, width, 0),
      wrapBlock(`  Type: ${item.evidenceType}; Strength: ${formatStrength(item.strength, style)}`, width, 0),
      wrapBlock(`  Alt: ${item.alternativeExplanation}`, width, 0),
    ]);

    return [
      style.bold(title),
      style.dim("=".repeat(Math.min(title.length, width))),
      wrapBlock(`Architecture: ${result.argumentArchitecture}`, width, 0),
      style.bold(style.cyan("Rewrites")),
      ...rewritesCompact,
      style.bold(style.cyan("Claim-Evidence Map")),
      ...claimMapCompact,
    ].join("\n");
  }

  const rewrites = result.decoderRewrites.flatMap((item, index) => [
    "",
    subheading(`Rewrite ${index + 1}`, style),
    wrapBlock(`Original: ${item.original}`, width),
    wrapBlock(`Plain English: ${item.plainEnglish}`, width),
    wrapBlock(`What it really means: ${item.explanation}`, width),
  ]);

  const claimMap = result.claimEvidenceMap.flatMap((item, index) => [
    "",
    subheading(`Claim ${index + 1}`, style),
    wrapBlock(`Claim: ${item.claim}`, width),
    wrapBlock(`Evidence: ${item.evidence}`, width),
    wrapBlock(`Evidence Type: ${item.evidenceType}`, width),
    wrapBlock(`Strength: ${formatStrength(item.strength, style)}`, width),
    wrapBlock(`Alternative Explanation: ${item.alternativeExplanation}`, width),
  ]);

  return [
    style.bold(title),
    style.dim("=".repeat(Math.min(title.length, width))),
    "",
    section("Argument Architecture", width, style),
    wrapBlock(result.argumentArchitecture, width),
    "",
    section("Paper Decoder Rewrites", width, style),
    ...rewrites,
    "",
    section("Claim-Evidence Map", width, style),
    ...claimMap,
  ].join("\n");
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

function formatAskPretty(question: string, result: AskResult, width: number, color: boolean, compact: boolean): string {
  const style = createStyler(color);

  if (compact) {
    return [
      style.bold("Follow-up Question"),
      style.dim("=".repeat(Math.min(18, width))),
      wrapBlock(`Q: ${question}`, width, 0),
      wrapBlock(`A: ${result.answer}`, width, 0),
      wrapBlock(`Confidence: ${result.confidence}`, width, 0),
      ...result.citedPassages.map((passage, index) => wrapBlock(`Passage ${index + 1}: ${passage}`, width, 0)),
    ].join("\n");
  }

  return [
    style.bold("Follow-up Question"),
    style.dim("=".repeat(Math.min(18, width))),
    "",
    subheading("Question", style),
    wrapBlock(question, width),
    "",
    subheading("Answer", style),
    wrapBlock(result.answer, width),
    "",
    subheading("Confidence", style),
    wrapBlock(result.confidence, width),
    "",
    section("Cited Passages", width, style),
    ...result.citedPassages.flatMap((passage) => [wrapBullet(passage, width), ""]),
  ].join("\n").trimEnd();
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

export function renderTriage(result: TriageResult, options: RenderOptions): string {
  if (options.format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (options.format === "markdown") {
    return formatTriageMarkdown(result);
  }

  return formatTriagePretty(result, options.width ?? 100, options.color ?? false, options.compact ?? false);
}

export function renderDeconstruction(result: DeconstructionResult, options: RenderOptions): string {
  if (options.format === "json") {
    return JSON.stringify(result, null, 2);
  }

  if (options.format === "markdown") {
    return formatDeconstructionMarkdown(result);
  }

  return formatDeconstructionPretty(result, options.width ?? 100, options.color ?? false, options.compact ?? false);
}

export function renderAsk(question: string, result: AskResult, options: RenderOptions): string {
  if (options.format === "json") {
    return JSON.stringify({ question, ...result }, null, 2);
  }

  if (options.format === "markdown") {
    return formatAskMarkdown(question, result);
  }

  return formatAskPretty(question, result, options.width ?? 100, options.color ?? false, options.compact ?? false);
}
