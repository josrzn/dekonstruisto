import { describe, expect, it } from "vitest";
import { extractJson, parseStructuredJson, repairEscapedJson } from "../src/llm.js";

describe("llm JSON parsing helpers", () => {
  it("extracts fenced JSON", () => {
    const text = '```json\n{"ok":true}\n```';
    expect(extractJson(text)).toBe('{"ok":true}');
  });

  it("parses direct JSON", () => {
    expect(parseStructuredJson<{ ok: boolean }>("{\"ok\":true}")).toEqual({ ok: true });
  });

  it("repairs escaped JSON", () => {
    const escaped = '{\\"answer\\":\\"yes\\",\\"confidence\\":\\"high\\",\\"citedPassages\\":[\\"paper quote\\"]}';
    expect(parseStructuredJson<{ answer: string; confidence: string; citedPassages: string[] }>(escaped)).toEqual({
      answer: "yes",
      confidence: "high",
      citedPassages: ["paper quote"],
    });
  });

  it("repairs common escaped sequences", () => {
    expect(repairEscapedJson('\\"line 1\\nline 2\\"')).toBe('"line 1\nline 2"');
  });

  it("throws on non-json input", () => {
    expect(() => parseStructuredJson("not json at all")).toThrow("Model did not return JSON");
  });
});
