# Prompts.md

Log of AI-assisted prompts used during development of the Cover Letter Generator, via Claude Code.

## Milestone 1 — Project Scaffold

- Requested initial project scaffold (folder structure, .gitignore, empty HTML/CSS/JS entry points, README) with no application logic, per incremental-sprint workflow.

## Milestone 2 — Cover Letter Input Form

- Requested a form for Candidate Name, Job Role, Target Company, and Key Skills with accessible labels, basic required-field validation, and responsive styling — capture-only, no generation yet.

## Milestone 3 — Form State Capture

- Requested capturing validated form values into a plain JS object on submit, kept available for the next milestone's generator.

## Milestone 4 — Hardcoded Cover Letter Generator

- Requested a standalone function that builds a cover letter from a hardcoded template string using the captured form values.

## Milestone 5 — Render Generated Cover Letter

- Requested a dedicated, initially-hidden output section that renders the generated letter via `textContent`, revealed only after a valid submission.

## Milestone 6 — Copy to Clipboard

- Requested a Copy to Clipboard button using the Clipboard API, with success/failure feedback that reverts after a short delay.

## Milestone 7 — UI Refresh + Secure Gemini Environment Setup

- Requested a visual refresh to a warm neutral + sage green theme, and a minimal Node.js backend (built-in `http`, no framework) to keep a future Gemini API key server-side, with `.env`/`.env.example` set up so the key is never committed or exposed to the browser.

## Milestone 8 — Gemini API Integration

- Requested wiring the real Gemini API call into the backend: the frontend now POSTs form data to `/api/generate-cover-letter`, the server builds a prompt and calls Gemini using the server-side key, and returns only the generated text.
- Verified the model name against Google's live documentation after `gemini-2.0-flash` was shut down, and corrected it to `gemini-3.6-flash`.
- Iterated on the Gemini prompt wording to improve tone, structure, and output-format constraints (no Markdown fences, no meta-commentary).

## Milestone 9 — Generating State + API Error Handling

- Requested a "Generating..." button state with duplicate-submission prevention, and safe, generic user-facing error messages for failed Gemini/API requests.

## Milestone 10 — Resume PDF Upload and Text Extraction

- Requested a PDF resume upload control with client- and server-side validation (PDF-only, 5MB limit, magic-byte check) and server-side text extraction via `pdf-parse`, with extracted text kept in memory only — never written to disk, never displayed in full in the UI.

## Milestone 11 — Resume-Aware AI Cover Letter

- Requested connecting the extracted resume text to the Gemini generation flow: the server stores extracted text in memory behind a short-lived, random ID handed back to the browser (never the text itself), which the browser passes along when generating so the letter can be personalized using real resume details without the text ever touching localStorage or the page UI.

## Milestone 12 — Final UI/UX + Production-Ready Cleanup

- Requested a final polish pass: clearer visual hierarchy, resume upload area clarity, consistent spacing/hover/focus states, and this documentation update to bring README.md and Prompts.md in line with the finished project.
