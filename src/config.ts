import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  sectionModel: string;
  modelSections: boolean;
  maxContextChars: number;
}

export function getConfig(): AppConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and set your API key.");
  }

  const model = process.env.PAPER_DECONSTRUCTOR_MODEL || "gpt-4.1-mini";
  const modelSections = /^(1|true|yes)$/i.test(process.env.PAPER_DECONSTRUCTOR_MODEL_SECTIONS || "false");

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    model,
    sectionModel: process.env.PAPER_DECONSTRUCTOR_SECTION_MODEL || model,
    modelSections,
    maxContextChars: Number(process.env.PAPER_DECONSTRUCTOR_MAX_CONTEXT_CHARS || 60000),
  };
}
