#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { getConfig } from "./config.js";
import { OutputFormat, renderAsk, renderDeconstruction, renderTriage } from "./format.js";
import { generateStructuredOutput } from "./llm.js";
import { extractPaperText } from "./pdf.js";
import { buildAskPrompt, buildDeconstructionPrompt, buildTriagePrompt } from "./prompts.js";
import { AskResult, DeconstructionResult, TriageResult } from "./types.js";

interface ParsedArgs {
  command?: string;
  filePath?: string;
  outPath?: string;
  question?: string;
  format?: OutputFormat;
  noColor?: boolean;
}

function printHelp(): void {
  console.log(`Paper Deconstructor CLI

Usage:
  npm run dev -- triage <paper.pdf> [--format pretty|markdown|json] [--out output.txt]
  npm run dev -- deconstruct <paper.pdf> [--format pretty|markdown|json] [--out output.txt]
  npm run dev -- ask <paper.pdf> --question "What is the weakest evidence?" [--format pretty|markdown|json] [--out output.txt]

Shortcuts:
  --markdown    same as --format markdown
  --json        same as --format json
  --no-color    disable ANSI colors in pretty output

Defaults:
  format defaults to pretty in the terminal
  if --out ends with .md or .json, that format is inferred unless overridden

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
    } else if (token === "--format") {
      const value = rest[index + 1] as OutputFormat | undefined;
      if (!value || !["pretty", "markdown", "json"].includes(value)) {
        throw new Error("Invalid --format. Use pretty, markdown, or json.");
      }
      parsed.format = value;
      index += 1;
    } else if (token === "--markdown") {
      parsed.format = "markdown";
    } else if (token === "--json") {
      parsed.format = "json";
    } else if (token === "--no-color") {
      parsed.noColor = true;
    }
  }

  return parsed;
}

function inferFormatFromPath(filePath: string | undefined): OutputFormat | undefined {
  if (!filePath) {
    return undefined;
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".md") {
    return "markdown";
  }
  if (extension === ".json") {
    return "json";
  }
  return undefined;
}

function resolveFormat(args: ParsedArgs): OutputFormat {
  return args.format ?? inferFormatFromPath(args.outPath) ?? "pretty";
}

function getPrettyWidth(): number {
  const columns = process.stdout.columns ?? 100;
  return Math.max(60, Math.min(columns, 120));
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
  const format = resolveFormat(args);
  const prettyWidth = getPrettyWidth();
  const useColor = format === "pretty" && process.stdout.isTTY && !args.noColor;

  if (args.command === "triage") {
    const prompt = buildTriagePrompt(paper.fileName, paper.text);
    const result = await generateStructuredOutput<TriageResult>(prompt);
    const terminalOutput = renderTriage(result, { format, color: useColor, width: prettyWidth });
    console.log(terminalOutput);
    const fileOutput = renderTriage(result, { format, color: false, width: prettyWidth });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  if (args.command === "deconstruct") {
    const prompt = buildDeconstructionPrompt(paper.fileName, paper.text);
    const result = await generateStructuredOutput<DeconstructionResult>(prompt);
    const terminalOutput = renderDeconstruction(result, { format, color: useColor, width: prettyWidth });
    console.log(terminalOutput);
    const fileOutput = renderDeconstruction(result, { format, color: false, width: prettyWidth });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  if (args.command === "ask") {
    if (!args.question) {
      throw new Error("Missing --question for ask command.");
    }

    const prompt = buildAskPrompt(paper.fileName, paper.text, args.question);
    const result = await generateStructuredOutput<AskResult>(prompt);
    const terminalOutput = renderAsk(args.question, result, { format, color: useColor, width: prettyWidth });
    console.log(terminalOutput);
    const fileOutput = renderAsk(args.question, result, { format, color: false, width: prettyWidth });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
