# Dekonstruisto

Dekonstruisto is a TypeScript command-line tool for skeptical first-pass reading of academic papers.

Instead of producing a generic summary, it tries to answer questions like:
- what is the paper really claiming?
- what kind of contribution is this actually?
- what is the strongest evidence?
- what is the weakest link?
- should this paper be read now, skimmed, or ignored unless directly relevant?

The CLI currently supports three main workflows:
- `triage`: a fast structured read for deciding whether a paper deserves more time
- `deconstruct`: a deeper structural analysis of the paper's argument, key decoded sentences, and claim-evidence map
- `ask`: follow-up questions grounded in the paper text and any cached prior analysis

## What this version includes

- `triage`: generates a Mode 1 Triage Card
- `deconstruct`: generates a minimal Mode 2 Deconstruction Report
- `ask`: asks a follow-up question against the paper text and reuses cached triage/deconstruction context when available
- local file or URL input support for PDF, TXT, and Markdown resources
- terminal-friendly pretty output by default
- richer pretty-mode styling with Unicode box drawing
- optional compact terminal mode for denser scanning
- optional Markdown and JSON output modes
- spinner feedback while reading and analyzing in interactive terminals
- local caching for triage and deconstruction results
- triage runs as a multi-step prompt chain with an explicit quality-check pass
- deconstruct runs as a multi-step prompt chain with a final quality-check pass
- optional `--debug` mode to show triage or deconstruct chain artifacts
- optional model-assisted section normalization with caching
- OpenAI-compatible LLM backend via environment variables

## Simple stack

- Node.js
- TypeScript
- `pdf-parse` for PDF text extraction
- `openai` SDK for model calls
- plain CLI argument parsing

## Setup

```bash
npm install
cp .env.example .env
```

Set at least:

```bash
OPENAI_API_KEY=...
DEKONSTRUISTO_MODEL=gpt-4.1-mini
```

Temperature defaults are model-aware:
- `gpt-5*` models default to `1`
- other models default to `0.2`

You can override them explicitly with:
- `DEKONSTRUISTO_TEMPERATURE`
- `DEKONSTRUISTO_SECTION_TEMPERATURE`

## Usage

### Triage

```bash
npm run dev -- triage path/to/paper.pdf
npm run dev -- triage https://arxiv.org/pdf/2501.12345.pdf
```

### Deconstruct

```bash
npm run dev -- deconstruct path/to/paper.pdf
npm run dev -- deconstruct https://example.org/paper.pdf
```

This now runs a multi-step deconstruction chain that separately extracts argument architecture, decoder rewrites, and claim-evidence structure before a final quality-check pass.

### Follow-up question

```bash
npm run dev -- ask path/to/paper.pdf --question "What is the weakest link in the paper's argument?"
npm run dev -- ask https://example.org/paper.pdf --question "What is actually novel here?"
```

If cached `triage` and/or `deconstruct` results exist for the same paper and model, `ask` will reuse them as supplemental context while still grounding its answer in the paper text.

## Output formats

The CLI defaults to a terminal-friendly `pretty` format.

### Compact terminal output

```bash
npm run dev -- triage path/to/paper.pdf --compact
```

### Model-assisted section normalization

```bash
npm run dev -- triage path/to/paper.pdf --model-sections
```

This runs a cached model pass that normalizes title/abstract/introduction/conclusion/body structure before the main analysis. Heuristic extraction still provides the initial draft and fallback.

You can also enable it by default in `.env`:

```bash
DEKONSTRUISTO_MODEL_SECTIONS=true
DEKONSTRUISTO_SECTION_MODEL=gpt-4.1-mini
```

### Debug chain artifacts

```bash
npm run dev -- triage path/to/paper.pdf --debug
npm run dev -- deconstruct path/to/paper.pdf --debug
```

For `triage`, this shows the extraction step, the pre-gate synthesis, and the quality-gate verdict/issues alongside the final triage output.

For `deconstruct`, this shows the extracted argument architecture, decoder selections, claim-evidence extraction, and the final quality-gate verdict/issues alongside the final deconstruction output.

### Cache control

By default, `triage` and `deconstruct` reuse cached structured results when the paper text, command, model, and prompt version match.

```bash
npm run dev -- triage path/to/paper.pdf --force
npm run dev -- deconstruct path/to/paper.pdf --force
npm run dev -- triage path/to/paper.pdf --no-cache
```

- `--force`: bypass cache reads and regenerate, then update the cache
- `--no-cache`: bypass cache reads and writes entirely for a one-off run
- `--debug`: skips triage/deconstruct cache reads so intermediate chain artifacts can be shown, but still writes the final result to cache unless `--no-cache` is also set
- `ask` reuses cached triage/deconstruct results as supplemental context unless `--no-cache` is set

### Markdown

```bash
npm run dev -- triage path/to/paper.pdf --markdown
```

### JSON

```bash
npm run dev -- triage path/to/paper.pdf --json
```

### Explicit format selection

```bash
npm run dev -- triage path/to/paper.pdf --format pretty
npm run dev -- triage path/to/paper.pdf --format markdown
npm run dev -- triage path/to/paper.pdf --format json
```

### Save output

```bash
npm run dev -- triage path/to/paper.pdf --out output/triage.txt
npm run dev -- triage path/to/paper.pdf --out output/triage.md
npm run dev -- triage path/to/paper.pdf --out output/triage.json
```

If `--out` ends with `.md` or `.json`, the CLI infers that format unless you override it with `--format`.

### Disable color

```bash
npm run dev -- triage path/to/paper.pdf --no-color
```

## Build

```bash
npm run build
```

## Notes

- This is intentionally minimal. It does not yet do figure extraction, batch processing, personalization, or adversarial review.
- The PDF/text ingestion now does basic heuristic section-aware extraction, and can optionally run a cached model-assisted normalization pass on top of that.
- Remote `http`/`https` resources can be used directly, but localhost and private-network URLs are rejected by default as a safety measure.
- Remote downloads are limited in size and time to keep the CLI reasonably safe and responsive.
- Cached results are stored in `.dekonstruisto-cache/` and are keyed by command, model, prompt version, and extracted paper text.
- For long PDFs, the CLI trims the structured paper context to fit a practical context window.
- You can point the CLI at another OpenAI-compatible provider with `OPENAI_BASE_URL`.
