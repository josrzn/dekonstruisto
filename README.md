# Paper Deconstructor CLI

A minimal TypeScript CLI implementation of the Paper Deconstructor MVP described in `docs/Paper_Deconstructor_PRD.docx`.

## What this version includes

- `triage`: generates a Mode 1 Triage Card
- `deconstruct`: generates a minimal Mode 2 Deconstruction Report
- `ask`: asks a follow-up question against the paper text
- PDF, TXT, and Markdown input support
- terminal-friendly pretty output by default
- optional compact terminal mode for denser scanning
- optional Markdown and JSON output modes
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
- For long PDFs, the CLI trims the paper text to fit a practical context window by keeping more of the front of the paper and some of the end.
- You can point the CLI at another OpenAI-compatible provider with `OPENAI_BASE_URL`.
