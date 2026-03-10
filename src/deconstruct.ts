import { generateStructuredOutput } from "./llm.js";
import {
  buildDeconstructionArchitecturePrompt,
  buildDeconstructionAssembly,
  buildDeconstructionClaimMapPrompt,
  buildDeconstructionDecoderPrompt,
  buildDeconstructionQualityGatePrompt,
} from "./prompts.js";
import { Spinner } from "./spinner.js";
import {
  DeconstructionArchitecture,
  DeconstructionChainArtifacts,
  DeconstructionClaimMap,
  DeconstructionDecoder,
  DeconstructionQualityGate,
} from "./types.js";

export async function runDeconstructionChain(
  fileName: string,
  paperText: string,
  spinner?: Spinner,
): Promise<DeconstructionChainArtifacts> {
  spinner?.update("Extracting argument architecture...");
  const architecture = await generateStructuredOutput<DeconstructionArchitecture>(
    buildDeconstructionArchitecturePrompt(fileName, paperText),
  );

  spinner?.update("Extracting decoder rewrites...");
  const decoder = await generateStructuredOutput<DeconstructionDecoder>(
    buildDeconstructionDecoderPrompt(fileName, paperText),
  );

  spinner?.update("Building claim-evidence map...");
  const claimMap = await generateStructuredOutput<DeconstructionClaimMap>(
    buildDeconstructionClaimMapPrompt(fileName, paperText),
  );

  const assembly = buildDeconstructionAssembly(architecture, decoder, claimMap);

  spinner?.update("Quality-checking deconstruction...");
  const qualityGate = await generateStructuredOutput<DeconstructionQualityGate>(
    buildDeconstructionQualityGatePrompt(fileName, paperText, architecture, decoder, claimMap, assembly),
  );

  if (qualityGate.verdict === "revise") {
    if (!qualityGate.revisedDeconstruction) {
      throw new Error("Deconstruction quality gate requested revision but did not provide revisedDeconstruction.");
    }

    return {
      architecture,
      decoder,
      claimMap,
      assembly,
      qualityGate,
      finalResult: qualityGate.revisedDeconstruction,
    };
  }

  return {
    architecture,
    decoder,
    claimMap,
    assembly,
    qualityGate,
    finalResult: assembly,
  };
}
