import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  maxContextChars: number;
}

export function getConfig(): AppConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and set your API key.");
  }

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    model: process.env.PAPER_DECONSTRUCTOR_MODEL || "gpt-4.1-mini",
    maxContextChars: Number(process.env.PAPER_DECONSTRUCTOR_MAX_CONTEXT_CHARS || 60000),
  };
}
