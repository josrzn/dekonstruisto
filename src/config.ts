import dotenv from "dotenv";

dotenv.config();

export interface AppConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  sectionModel: string;
  modelSections: boolean;
  temperature: number;
  sectionTemperature: number;
  maxContextChars: number;
}

function defaultTemperatureForModel(model: string): number {
  return model.startsWith("gpt-5") ? 1 : 0.2;
}

function parseTemperature(value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

export function getConfig(): AppConfig {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Copy .env.example to .env and set your API key.");
  }

  const model = process.env.DEKONSTRUISTO_MODEL || "gpt-4.1-mini";
  const modelSections = /^(1|true|yes)$/i.test(process.env.DEKONSTRUISTO_MODEL_SECTIONS || "false");
  const sectionModel = process.env.DEKONSTRUISTO_SECTION_MODEL || model;
  const temperature = parseTemperature(process.env.DEKONSTRUISTO_TEMPERATURE, defaultTemperatureForModel(model));
  const sectionTemperature = parseTemperature(
    process.env.DEKONSTRUISTO_SECTION_TEMPERATURE,
    defaultTemperatureForModel(sectionModel),
  );

  return {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL,
    model,
    sectionModel,
    modelSections,
    temperature,
    sectionTemperature,
    maxContextChars: Number(process.env.DEKONSTRUISTO_MAX_CONTEXT_CHARS || 60000),
  };
}
