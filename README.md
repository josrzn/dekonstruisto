# Paper Deconstructor CLI

A minimal TypeScript CLI implementation of the Paper Deconstructor MVP described in `docs/Paper_Deconstructor_PRD.docx`.

## What this version includes

- `triage`: generates a Mode 1 Triage Card
- `deconstruct`: generates a minimal Mode 2 Deconstruction Report
- `ask`: asks a follow-up question against the paper text
- PDF, TXT, and Markdown input support
- terminal-friendly pretty output by default
- richer pretty-mode styling with Unicode box drawing
- optional compact terminal mode for denser scanning
- optional Markdown and JSON output modes
- spinner feedback while reading and analyzing in interactive terminals
- local caching for triage and deconstruction results
- triage runs as a multi-step prompt chain with an explicit quality-check pass
- optional `--debug` mode to show triage chain artifacts
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
PAPER_DECONSTRUCTOR_MODEL=gpt-4.1-mini
```

## Usage

### Triage

```bash
npm run dev -- triage path/to/paper.pdf
```

### Deconstruct

```bash
npm run dev -- deconstruct path/to/paper.pdf
```

### Follow-up question

```bash
npm run dev -- ask path/to/paper.pdf --question "What is the weakest link in the paper's argument?"
```

## Output formats

The CLI defaults to a terminal-friendly `pretty` format.

### Compact terminal output

```bash
npm run dev -- triage path/to/paper.pdf --compact
```

### Debug triage chain

```bash
npm run dev -- triage path/to/paper.pdf --debug
```

This shows the extraction step, the pre-gate synthesis, and the quality-gate verdict/issues alongside the final triage output.

### Cache control

By default, `triage` and `deconstruct` reuse cached structured results when the paper text, command, model, and prompt version match.

```bash
npm run dev -- triage path/to/paper.pdf --force
npm run dev -- deconstruct path/to/paper.pdf --force
npm run dev -- triage path/to/paper.pdf --no-cache
```

- `--force`: bypass cache reads and regenerate, then update the cache
- `--no-cache`: bypass cache reads and writes entirely for a one-off run
- `--debug`: skips triage cache reads so intermediate chain artifacts can be shown, but still writes the final triage result to cache unless `--no-cache` is also set

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

- This is intentionally minimal. It does not yet do figure extraction, section-aware parsing, batch processing, personalization, or adversarial review.
- Cached results are stored in `.paper-deconstructor-cache/` and are keyed by command, model, prompt version, and extracted paper text.
- For long PDFs, the CLI trims the paper text to fit a practical context window by keeping more of the front of the paper and some of the end.
- You can point the CLI at another OpenAI-compatible provider with `OPENAI_BASE_URL`.
