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

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function normalizeInline(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function wrapLines(text: string, width: number, firstPrefix = "", restPrefix = firstPrefix): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((paragraph) => normalizeInline(paragraph)).filter(Boolean);

  if (paragraphs.length === 0) {
    return [firstPrefix.trimEnd()];
  }

  const lines: string[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.split(" ");
    let currentPrefix = paragraphIndex === 0 ? firstPrefix : restPrefix;
    let current = currentPrefix;

    for (const word of words) {
      const hasContent = stripAnsi(current).trim().length > stripAnsi(currentPrefix).trim().length;
      const candidate = hasContent ? `${current} ${word}` : `${current}${word}`;

      if (stripAnsi(candidate).length <= width || !hasContent) {
        current = candidate;
      } else {
        lines.push(current);
        currentPrefix = restPrefix;
        current = `${restPrefix}${word}`;
      }
    }

    lines.push(current);

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push("");
    }
  });

  return lines;
}

function wrapWithPrefix(text: string, width: number, firstPrefix = "", restPrefix = firstPrefix): string {
  return wrapLines(text, width, firstPrefix, restPrefix).join("\n");
}

function wrapBlock(text: string, width: number, indent = 2): string {
  return wrapWithPrefix(text, width, " ".repeat(indent), " ".repeat(indent));
}

function wrapBullet(text: string, width: number, indent = 2, marker = "•"): string {
  const firstPrefix = `${" ".repeat(indent)}${marker} `;
  const restPrefix = " ".repeat(firstPrefix.length);
  return wrapWithPrefix(text, width, firstPrefix, restPrefix);
}

function padRight(text: string, width: number): string {
  const visibleLength = stripAnsi(text).length;
  return visibleLength >= width ? text : `${text}${" ".repeat(width - visibleLength)}`;
}

function rule(width: number, style: Styler): string {
  return style.cyan("─".repeat(Math.max(12, width)));
}

function section(title: string, width: number, style: Styler): string {
  return `${style.bold(style.cyan(title))}\n${rule(Math.min(Math.max(title.length + 6, 12), width), style)}`;
}

function subheading(title: string, style: Styler): string {
  return style.bold(title);
}

function titleBlock(title: string, width: number, style: Styler): string {
  const visibleWidth = Math.max(20, Math.min(width, 120));
  const line = style.cyan("═".repeat(Math.min(Math.max(stripAnsi(title).length, 12), visibleWidth)));
  return `${style.bold(title)}\n${line}`;
}

function makeBox(title: string, bodyLines: string[], width: number, style: Styler): string {
  const outerWidth = Math.max(40, Math.min(width, 120));
  const innerWidth = outerWidth - 4;
  const titleText = ` ${title} `;
  const titleLen = stripAnsi(titleText).length;
  const borderWidth = innerWidth + 2;
  const leftBorder = 1;
  const rightBorder = Math.max(0, borderWidth - leftBorder - titleLen);
  const top = `${style.cyan("┌")}${style.cyan("─".repeat(leftBorder))}${style.bold(style.cyan(titleText))}${style.cyan("─".repeat(rightBorder))}${style.cyan("┐")}`;
  const bottom = `${style.cyan("└")}${style.cyan("─".repeat(borderWidth))}${style.cyan("┘")}`;

  const lines = bodyLines.length > 0 ? bodyLines : [""];
  const body = lines.map((line) => `${style.cyan("│")} ${padRight(line, innerWidth)} ${style.cyan("│")}`).join("\n");

  return `${top}\n${body}\n${bottom}`;
}

function boxText(title: string, text: string, width: number, style: Styler): string {
  const innerWidth = Math.max(20, Math.min(width, 120) - 4);
  return makeBox(title, wrapLines(text, innerWidth), width, style);
}

function boxBullets(title: string, items: string[], width: number, style: Styler): string {
  const innerWidth = Math.max(20, Math.min(width, 120) - 4);
  const lines = items.flatMap((item) => wrapLines(item, innerWidth, "• ", "  "));
  return makeBox(title, lines, width, style);
}

function boxKeyValue(title: string, rows: Array<{ label: string; value: string }>, width: number, style: Styler): string {
  const innerWidth = Math.max(20, Math.min(width, 120) - 4);
  const lines = rows.flatMap((row) => wrapLines(`${row.label}: ${row.value}`, innerWidth));
  return makeBox(title, lines, width, style);
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
      titleBlock(title, width, style),
      wrapBlock(`Thesis: ${result.oneLineThesis}`, width, 0),
      wrapBlock(`Type: ${result.contributionType.join(", ")}`, width, 0),
      wrapBlock(
        `Mechanism: Bias/Method=${result.mechanismDecomposition.biasOrMethod}; Data/Structure=${result.mechanismDecomposition.dataOrStructure}; Claimed Effect=${result.mechanismDecomposition.claimedEffect}; Why=${result.mechanismDecomposition.whyAuthorsExpectIt}`,
        width,
        0,
      ),
      wrapBlock(`Strongest evidence: ${result.strongestEvidence.summary}`, width, 0),
      wrapBlock(`Passage: ${result.strongestEvidence.supportingPassage}`, width, 0),
      wrapBlock(`Weakest link: ${result.weakestLink.summary}`, width, 0),
      wrapBlock(`Passage: ${result.weakestLink.supportingPassage}`, width, 0),
      wrapBlock(`Recommendation: ${formatVerdict(result.investmentRecommendation.verdict, style)} — ${result.investmentRecommendation.justification}`, width, 0),
    ].join("\n");
  }

  return [
    titleBlock(title, width, style),
    "",
    makeBox("Triage Card", [
      ...wrapLines(result.oneLineThesis, Math.max(20, Math.min(width, 120) - 4), "Thesis: ", "        "),
      "",
      ...wrapLines(result.contributionType.join(", "), Math.max(20, Math.min(width, 120) - 4), "Type: ", "      "),
    ], width, style),
    "",
    boxKeyValue(
      "Mechanism Decomposition",
      [
        { label: "Bias / Method", value: result.mechanismDecomposition.biasOrMethod },
        { label: "Data / Structure", value: result.mechanismDecomposition.dataOrStructure },
        { label: "Claimed Effect", value: result.mechanismDecomposition.claimedEffect },
        { label: "Why Authors Expect It", value: result.mechanismDecomposition.whyAuthorsExpectIt },
      ],
      width,
      style,
    ),
    "",
    boxText(
      "Strongest Evidence",
      `${result.strongestEvidence.summary}\n\nPassage: ${result.strongestEvidence.supportingPassage}`,
      width,
      style,
    ),
    "",
    boxText(
      "Weakest Link",
      `${result.weakestLink.summary}\n\nPassage: ${result.weakestLink.supportingPassage}`,
      width,
      style,
    ),
    "",
    boxText(
      "Recommendation",
      `${formatVerdict(result.investmentRecommendation.verdict, style)}\n\n${result.investmentRecommendation.justification}`,
      width,
      style,
    ),
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
      wrapBlock(`Plain English: ${item.plainEnglish}`, width, 0),
      wrapBlock(`Meaning: ${item.explanation}`, width, 0),
    ]);

    const claimMapCompact = result.claimEvidenceMap.flatMap((item, index) => [
      wrapBlock(`Claim ${index + 1}: ${item.claim}`, width, 0),
      wrapBlock(`Evidence: ${item.evidence}`, width, 0),
      wrapBlock(`Type: ${item.evidenceType}; Strength: ${formatStrength(item.strength, style)}`, width, 0),
      wrapBlock(`Alt: ${item.alternativeExplanation}`, width, 0),
    ]);

    return [
      titleBlock(title, width, style),
      wrapBlock(`Architecture: ${result.argumentArchitecture}`, width, 0),
      style.bold(style.cyan("Rewrites")),
      rule(Math.min(width, 24), style),
      ...rewritesCompact,
      style.bold(style.cyan("Claim-Evidence Map")),
      rule(Math.min(width, 24), style),
      ...claimMapCompact,
    ].join("\n");
  }

  const rewriteBoxes = result.decoderRewrites.map((item, index) =>
    boxKeyValue(
      `Rewrite ${index + 1}`,
      [
        { label: "Original", value: item.original },
        { label: "Plain English", value: item.plainEnglish },
        { label: "What it really means", value: item.explanation },
      ],
      width,
      style,
    ),
  );

  const claimBoxes = result.claimEvidenceMap.map((item, index) =>
    boxKeyValue(
      `Claim ${index + 1}`,
      [
        { label: "Claim", value: item.claim },
        { label: "Evidence", value: item.evidence },
        { label: "Evidence Type", value: item.evidenceType },
        { label: "Strength", value: formatStrength(item.strength, style) },
        { label: "Alternative Explanation", value: item.alternativeExplanation },
      ],
      width,
      style,
    ),
  );

  return [
    titleBlock(title, width, style),
    "",
    boxText("Argument Architecture", result.argumentArchitecture, width, style),
    "",
    section("Paper Decoder Rewrites", width, style),
    ...rewriteBoxes.flatMap((box) => ["", box]),
    "",
    section("Claim-Evidence Map", width, style),
    ...claimBoxes.flatMap((box) => ["", box]),
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
      titleBlock("Follow-up Question", width, style),
      wrapBlock(`Q: ${question}`, width, 0),
      wrapBlock(`A: ${result.answer}`, width, 0),
      wrapBlock(`Confidence: ${result.confidence}`, width, 0),
      ...result.citedPassages.map((passage, index) => wrapBlock(`Passage ${index + 1}: ${passage}`, width, 0)),
    ].join("\n");
  }

  return [
    titleBlock("Follow-up Question", width, style),
    "",
    boxKeyValue(
      "Question & Answer",
      [
        { label: "Question", value: question },
        { label: "Answer", value: result.answer },
        { label: "Confidence", value: result.confidence },
      ],
      width,
      style,
    ),
    "",
    boxBullets("Cited Passages", result.citedPassages, width, style),
  ].join("\n");
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
