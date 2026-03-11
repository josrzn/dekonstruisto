import { generateStructuredOutput } from "./llm.js";
import { buildSectionNormalizationPrompt, SECTION_NORMALIZATION_PROMPT_VERSION } from "./prompts.js";
import { PaperSections, trimPaperContext } from "./pdf.js";
import { Spinner } from "./spinner.js";

export interface NormalizedSectionResult extends PaperSections {
  referencesDetected: boolean;
  notes: string[];
}

function cleanOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function cleanRequiredText(value: string | null | undefined, fallback: string): string {
  const cleaned = cleanOptionalText(value);
  return cleaned ?? fallback;
}

export function mergeNormalizedSections(heuristic: PaperSections, normalized: NormalizedSectionResult): PaperSections {
  return {
    title: cleanOptionalText(normalized.title) ?? heuristic.title,
    abstract: cleanOptionalText(normalized.abstract) ?? heuristic.abstract,
    introduction: cleanOptionalText(normalized.introduction) ?? heuristic.introduction,
    conclusion: cleanOptionalText(normalized.conclusion) ?? heuristic.conclusion,
    body: cleanRequiredText(normalized.body, heuristic.body),
  };
}

export async function normalizePaperSectionsWithModel(
  fileName: string,
  rawText: string,
  heuristicSections: PaperSections,
  sectionModel: string,
  maxChars: number,
  spinner?: Spinner,
): Promise<NormalizedSectionResult> {
  spinner?.update("Normalizing paper structure with model...");
  const prompt = buildSectionNormalizationPrompt(
    fileName,
    trimPaperContext(rawText, Math.min(maxChars, 40000)),
    heuristicSections,
  );

  const normalized = await generateStructuredOutput<NormalizedSectionResult>(prompt, { model: sectionModel });

  return {
    title: cleanOptionalText(normalized.title),
    abstract: cleanOptionalText(normalized.abstract),
    introduction: cleanOptionalText(normalized.introduction),
    conclusion: cleanOptionalText(normalized.conclusion),
    body: cleanRequiredText(normalized.body, heuristicSections.body),
    referencesDetected: Boolean(normalized.referencesDetected),
    notes: Array.isArray(normalized.notes) ? normalized.notes : [],
  };
}

export { SECTION_NORMALIZATION_PROMPT_VERSION };
