#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { formatAskMarkdown, formatDeconstructionMarkdown, formatTriageMarkdown } from "./format.js";
import { generateStructuredOutput } from "./llm.js";
import { extractPaperText } from "./pdf.js";
import { buildAskPrompt, buildDeconstructionPrompt, buildTriagePrompt } from "./prompts.js";
import { AskResult, DeconstructionResult, TriageResult } from "./types.js";

interface ParsedArgs {
  command?: string;
  filePath?: string;
  outPath?: string;
  question?: string;
}

function printHelp(): void {
  console.log(`Paper Deconstructor CLI

Usage:
  npm run dev -- triage <paper.pdf> [--out output.md]
  npm run dev -- deconstruct <paper.pdf> [--out output.md]
  npm run dev -- ask <paper.pdf> --question "What is the weakest evidence?" [--out output.md]

Environment:
  OPENAI_API_KEY                Required
  PAPER_DECONSTRUCTOR_MODEL     Optional, defaults to gpt-4.1-mini
  OPENAI_BASE_URL               Optional, for OpenAI-compatible providers
`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command, filePath, ...rest] = argv;
  const parsed: ParsedArgs = { command, filePath };

  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];

    if (token === "--out") {
      parsed.outPath = rest[index + 1];
      index += 1;
    } else if (token === "--question") {
      parsed.question = rest[index + 1];
      index += 1;
    }
  }

  return parsed;
}

async function writeIfRequested(outPath: string | undefined, content: string): Promise<void> {
  if (!outPath) {
    return;
  }

  const absolutePath = path.resolve(outPath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, content, "utf8");
  console.log(`\nSaved output to ${absolutePath}`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === "help" || args.command === "--help" || args.command === "-h") {
    printHelp();
    return;
  }

  if (!args.filePath) {
    throw new Error("Missing paper path.");
  }

  const config = getConfig();
  const paper = await extractPaperText(args.filePath, config.maxContextChars);

  if (args.command === "triage") {
    const prompt = buildTriagePrompt(paper.fileName, paper.text);
    const result = await generateStructuredOutput<TriageResult>(prompt);
    const markdown = formatTriageMarkdown(result);
    console.log(markdown);
    await writeIfRequested(args.outPath, markdown);
    return;
  }

  if (args.command === "deconstruct") {
    const prompt = buildDeconstructionPrompt(paper.fileName, paper.text);
    const result = await generateStructuredOutput<DeconstructionResult>(prompt);
    const markdown = formatDeconstructionMarkdown(result);
    console.log(markdown);
    await writeIfRequested(args.outPath, markdown);
    return;
  }

  if (args.command === "ask") {
    if (!args.question) {
      throw new Error("Missing --question for ask command.");
    }

    const prompt = buildAskPrompt(paper.fileName, paper.text, args.question);
    const result = await generateStructuredOutput<AskResult>(prompt);
    const markdown = formatAskMarkdown(args.question, result);
    console.log(markdown);
    await writeIfRequested(args.outPath, markdown);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
