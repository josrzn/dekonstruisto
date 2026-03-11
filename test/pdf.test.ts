import { describe, expect, it } from "vitest";
import { buildPaperContext, parsePaperSections } from "../src/pdf.js";

describe("pdf section-aware extraction helpers", () => {
  const text = `Example Paper Title
Jane Doe

Abstract
This paper studies whether cue tokens explain the effect.

1 Introduction
We investigate whether candidate reasoning features actually detect lexical cues.

2 Method
We inject cue tokens into non-reasoning text.

5 Conclusion
The evidence suggests that many candidate reasoning features mostly respond to cues.

References
[1] Something`;

  it("parses title and major sections", () => {
    const sections = parsePaperSections(text);

    expect(sections.title).toBe("Example Paper Title");
    expect(sections.abstract).toContain("This paper studies");
    expect(sections.introduction).toContain("candidate reasoning features");
    expect(sections.conclusion).toContain("mostly respond to cues");
  });

  it("drops references from body", () => {
    const sections = parsePaperSections(text);
    expect(sections.body).not.toContain("References");
    expect(sections.body).not.toContain("[1] Something");
  });

  it("builds structured context with section labels", () => {
    const sections = parsePaperSections(text);
    const context = buildPaperContext(sections, 1000);

    expect(context).toContain("Title");
    expect(context).toContain("Abstract");
    expect(context).toContain("Introduction");
    expect(context).toContain("Conclusion");
    expect(context).toContain("Main Body");
  });
});
