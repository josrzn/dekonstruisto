#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { readCachedResult, writeCachedResult } from "./cache.js";
import { getConfig } from "./config.js";
import { runDeconstructionChain } from "./deconstruct.js";
import { OutputFormat, renderAsk, renderDeconstruction, renderTriage, renderTriageDebug } from "./format.js";
import { generateStructuredOutput } from "./llm.js";
import { extractPaperText } from "./pdf.js";
import { buildAskPrompt, DECONSTRUCTION_CHAIN_VERSION, TRIAGE_CHAIN_VERSION } from "./prompts.js";
import { Spinner } from "./spinner.js";
import { runTriageChain } from "./triage.js";
import { AskResult, DeconstructionResult, TriageChainArtifacts, TriageResult } from "./types.js";

interface ParsedArgs {
  command?: string;
  filePath?: string;
  outPath?: string;
  question?: string;
  format?: OutputFormat;
  noColor?: boolean;
  compact?: boolean;
  force?: boolean;
  noCache?: boolean;
  debug?: boolean;
}

let activeSpinner: Spinner | undefined;

function printHelp(): void {
  console.log(`Paper Deconstructor CLI

Usage:
  npm run dev -- triage <paper.pdf> [--format pretty|markdown|json] [--out output.txt]
  npm run dev -- deconstruct <paper.pdf> [--format pretty|markdown|json] [--out output.txt]
  npm run dev -- ask <paper.pdf> --question "What is the weakest evidence?" [--format pretty|markdown|json] [--out output.txt]

Shortcuts:
  --markdown    same as --format markdown
  --json        same as --format json
  --compact     denser pretty output for terminal scanning
  --debug       show triage chain artifacts (extraction, pre-gate synthesis, quality gate)
  --force       bypass cached triage/deconstruction and regenerate
  --no-cache    do not read from or write to cache
  --no-color    disable ANSI colors in pretty output

Interactive UX:
  pretty mode uses richer box-drawing styling
  a spinner is shown while reading and analyzing when run in a TTY

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
    } else if (token === "--compact") {
      parsed.compact = true;
    } else if (token === "--force") {
      parsed.force = true;
    } else if (token === "--no-cache") {
      parsed.noCache = true;
    } else if (token === "--debug") {
      parsed.debug = true;
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
  const format = resolveFormat(args);
  const prettyWidth = getPrettyWidth();
  const useColor = format === "pretty" && process.stdout.isTTY && !args.noColor;
  const compact = format === "pretty" && !!args.compact;
  const spinner = new Spinner(process.stdout.isTTY && process.stderr.isTTY);
  activeSpinner = spinner;
  const cacheEnabled = !args.noCache;

  spinner.start("Reading paper...");
  const paper = await extractPaperText(args.filePath, config.maxContextChars);

  if (args.command === "triage") {
    let result: TriageResult | null = null;
    let artifacts: TriageChainArtifacts | null = null;
    const canReadTriageCache = cacheEnabled && !args.force && !args.debug;

    if (canReadTriageCache) {
      spinner.update("Checking triage cache...");
      result = await readCachedResult<TriageResult>({
        command: "triage",
        model: config.model,
        promptVersion: TRIAGE_CHAIN_VERSION,
        paperText: paper.text,
      });
    }

    if (result) {
      spinner.stop("Loaded cached triage.");
    } else {
      spinner.update(
        args.debug
          ? "Running triage chain with debug artifacts..."
          : args.force
            ? "Regenerating triage..."
            : cacheEnabled
              ? "Running triage chain..."
              : "Running triage chain without cache...",
      );
      artifacts = await runTriageChain(paper.fileName, paper.text, spinner);
      result = artifacts.finalResult;
      if (cacheEnabled) {
        await writeCachedResult(
          {
            command: "triage",
            model: config.model,
            promptVersion: TRIAGE_CHAIN_VERSION,
            paperText: paper.text,
          },
          result,
        );
      }
      spinner.stop();
    }

    if (args.debug) {
      if (!artifacts) {
        artifacts = await runTriageChain(paper.fileName, paper.text);
      }

      if (format === "json") {
        const debugJson = JSON.stringify(
          {
            triage: result,
            debug: artifacts,
          },
          null,
          2,
        );
        console.log(debugJson);
        await writeIfRequested(args.outPath, debugJson);
        return;
      }

      const terminalOutput = [
        renderTriage(result, { format, color: useColor, width: prettyWidth, compact }),
        renderTriageDebug(artifacts, { format, color: useColor, width: prettyWidth, compact }),
      ].join("\n\n");
      const fileOutput = [
        renderTriage(result, { format, color: false, width: prettyWidth, compact }),
        renderTriageDebug(artifacts, { format, color: false, width: prettyWidth, compact }),
      ].join("\n\n");
      console.log(terminalOutput);
      await writeIfRequested(args.outPath, fileOutput);
      return;
    }

    const terminalOutput = renderTriage(result, { format, color: useColor, width: prettyWidth, compact });
    console.log(terminalOutput);
    const fileOutput = renderTriage(result, { format, color: false, width: prettyWidth, compact });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  if (args.command === "deconstruct") {
    let result: DeconstructionResult | null = null;

    if (cacheEnabled && !args.force) {
      spinner.update("Checking deconstruction cache...");
      result = await readCachedResult<DeconstructionResult>({
        command: "deconstruct",
        model: config.model,
        promptVersion: DECONSTRUCTION_CHAIN_VERSION,
        paperText: paper.text,
      });
    }

    if (result) {
      spinner.stop("Loaded cached deconstruction.");
    } else {
      spinner.update(
        args.force
          ? "Regenerating deconstruction..."
          : cacheEnabled
            ? "Running deconstruction chain..."
            : "Running deconstruction chain without cache...",
      );
      const artifacts = await runDeconstructionChain(paper.fileName, paper.text, spinner);
      result = artifacts.finalResult;
      if (cacheEnabled) {
        await writeCachedResult(
          {
            command: "deconstruct",
            model: config.model,
            promptVersion: DECONSTRUCTION_CHAIN_VERSION,
            paperText: paper.text,
          },
          result,
        );
      }
      spinner.stop();
    }

    const terminalOutput = renderDeconstruction(result, { format, color: useColor, width: prettyWidth, compact });
    console.log(terminalOutput);
    const fileOutput = renderDeconstruction(result, { format, color: false, width: prettyWidth, compact });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  if (args.command === "ask") {
    if (!args.question) {
      spinner.stop();
      throw new Error("Missing --question for ask command.");
    }

    spinner.update("Answering follow-up question...");
    const prompt = buildAskPrompt(paper.fileName, paper.text, args.question);
    const result = await generateStructuredOutput<AskResult>(prompt);
    spinner.stop();
    const terminalOutput = renderAsk(args.question, result, { format, color: useColor, width: prettyWidth, compact });
    console.log(terminalOutput);
    const fileOutput = renderAsk(args.question, result, { format, color: false, width: prettyWidth, compact });
    await writeIfRequested(args.outPath, fileOutput);
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

main().catch((error) => {
  activeSpinner?.stop();
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error: ${message}`);
  process.exit(1);
});
