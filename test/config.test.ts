import { afterEach, describe, expect, it } from "vitest";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("getConfig temperature defaults", () => {
  it("defaults to temperature 1 for gpt-5 models", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DEKONSTRUISTO_MODEL = "gpt-5-mini";
    delete process.env.DEKONSTRUISTO_TEMPERATURE;
    delete process.env.DEKONSTRUISTO_SECTION_MODEL;
    delete process.env.DEKONSTRUISTO_SECTION_TEMPERATURE;

    const { getConfig } = await import("../src/config.js");
    const config = getConfig();

    expect(config.temperature).toBe(1);
    expect(config.sectionTemperature).toBe(1);
  });

  it("defaults to temperature 0.2 for non-gpt-5 models", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DEKONSTRUISTO_MODEL = "gpt-4.1-mini";
    delete process.env.DEKONSTRUISTO_TEMPERATURE;
    delete process.env.DEKONSTRUISTO_SECTION_MODEL;
    delete process.env.DEKONSTRUISTO_SECTION_TEMPERATURE;

    const { getConfig } = await import("../src/config.js");
    const config = getConfig();

    expect(config.temperature).toBe(0.2);
    expect(config.sectionTemperature).toBe(0.2);
  });

  it("allows explicit temperature overrides", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.DEKONSTRUISTO_MODEL = "gpt-5-mini";
    process.env.DEKONSTRUISTO_SECTION_MODEL = "gpt-4.1-mini";
    process.env.DEKONSTRUISTO_TEMPERATURE = "0.7";
    process.env.DEKONSTRUISTO_SECTION_TEMPERATURE = "0.4";

    const { getConfig } = await import("../src/config.js");
    const config = getConfig();

    expect(config.temperature).toBe(0.7);
    expect(config.sectionTemperature).toBe(0.4);
  });
});
