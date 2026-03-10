import OpenAI from "openai";
import { getConfig } from "./config.js";
import { BASE_SYSTEM_PROMPT } from "./prompts.js";

function extractJson(text: string): string {
  const trimmed = text.trim();

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error("Model did not return JSON.");
}

function tryParseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function repairEscapedJson(text: string): string {
  return text
    .replace(/^\s*"([\s\S]*)"\s*$/, "$1")
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"');
}

function parseStructuredJson<T>(text: string): T {
  const extracted = extractJson(text);

  const direct = tryParseJson<T>(extracted);
  if (direct !== null) {
    return direct;
  }

  const parsedString = tryParseJson<string>(`"${extracted.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`);
  if (typeof parsedString === "string") {
    const nested = tryParseJson<T>(parsedString);
    if (nested !== null) {
      return nested;
    }
  }

  const repaired = repairEscapedJson(extracted);
  const repairedParsed = tryParseJson<T>(repaired);
  if (repairedParsed !== null) {
    return repairedParsed;
  }

  const doubleEncoded = tryParseJson<string>(extracted);
  if (typeof doubleEncoded === "string") {
    const nested = tryParseJson<T>(doubleEncoded);
    if (nested !== null) {
      return nested;
    }
  }

  throw new Error("Model returned invalid JSON.");
}

export async function generateStructuredOutput<T>(userPrompt: string): Promise<T> {
  const config = getConfig();
  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const completion = await client.chat.completions.create({
    model: config.model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: BASE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model.");
  }

  return parseStructuredJson<T>(content);
}
