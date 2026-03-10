import { generateStructuredOutput } from "./llm.js";
import {
  buildTriageExtractionPrompt,
  buildTriageQualityGatePrompt,
  buildTriageSynthesisPrompt,
} from "./prompts.js";
import { Spinner } from "./spinner.js";
import { TriageChainArtifacts, TriageExtraction, TriageQualityGate, TriageResult } from "./types.js";

export async function runTriageChain(fileName: string, paperText: string, spinner?: Spinner): Promise<TriageChainArtifacts> {
  spinner?.update("Extracting core claims and evidence...");
  const extraction = await generateStructuredOutput<TriageExtraction>(buildTriageExtractionPrompt(fileName, paperText));

  spinner?.update("Synthesizing triage...");
  const synthesis = await generateStructuredOutput<TriageResult>(
    buildTriageSynthesisPrompt(fileName, paperText, extraction),
  );

  spinner?.update("Quality-checking triage...");
  const qualityGate = await generateStructuredOutput<TriageQualityGate>(
    buildTriageQualityGatePrompt(fileName, paperText, extraction, synthesis),
  );

  if (qualityGate.verdict === "revise") {
    if (!qualityGate.revisedTriage) {
      throw new Error("Triage quality gate requested revision but did not provide revisedTriage.");
    }

    return {
      extraction,
      synthesis,
      qualityGate,
      finalResult: qualityGate.revisedTriage,
    };
  }

  return {
    extraction,
    synthesis,
    qualityGate,
    finalResult: synthesis,
  };
}
