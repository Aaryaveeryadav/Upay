# Class 10 Science tutor — cited answers from a local model

The research prototypes in `experiments/science-ai/` (BM25 retrieval +
local Ollama tutor) are now wired into the web app behind one route:

| part | path |
| --- | --- |
| retrieval index (generated) | `assets/science/science-index.json` |
| index builder | `tools/science-index/build_science_index.js` |
| shared server module | `lib/science-rag.js` |
| local API route | `POST/GET /api/science/ask` in `server.js` |
| serverless/API route | `api/science/ask.js` |
| chat UI module | `assets/js/science-tutor.js` |
| page route | `#/tutor` (rail link **Science tutor**, chapter pages link here) |
| regression check | `node tools/check/science_tutor.js` |

## What a student sees

1. Type a Physics, Chemistry or Biology question (optionally scoped to a chapter).
2. The server retrieves the best 4 excerpts from the index (textbook sections,
   activities, summaries, NCERT exercises with verified answers and CBSE 2026
   board questions).
3. A **local** model drafts the answer from those excerpts only and marks claims
   with `[1]`-style citations. If the excerpts do not answer the question, it
   says so.
4. Every citation is a card: chapter, section, a **verified PDF page** when the
   index found the text on a page, the excerpt itself, a verified NCERT/board key
   when the app holds one, and links to the chapter or that chapter's board
   questions.
5. If the model cannot run, the page still shows the retrieved sources with an
   honest message. If nothing matched, no answer is generated at all.

The app never claims an answer is board-verified. Verified keys appear only on
sources flagged `verifiedKey` in the index (the 171 NCERT exercise answers).

## Build the index

The Python experiment indexes private PDFs into a git-ignored
`science-index.json`. The web app instead builds its index from the reviewed
data already served by the app, so the index is reproducible and reviewable:

```sh
node tools/science-index/build_science_index.js          # writes the index
node tools/science-index/build_science_index.js --check  # fails if stale
```

It reads `assets/science/science10.js`, `assets/js/data/science10-q.js`,
`assets/js/data/pyq-science.js`, `assets/science/_extract.json` and
`assets/science/_pyq-ocr.json`, and commits the SHA-256 of each input into the
index. Only these rules attach metadata:

- **Page numbers** come from matching normalised text from the chunk against the
  extracted PDF page text. A chunk with no match has `page: null` and the UI
  says "No verified PDF page" instead of guessing.
- **Answers** come only from key-verified records. Board questions without a
  verified key are indexed as questions only.
- Exercises duplicated inside `pyq-science.js` (the 171 rows with no year) are
  skipped; they are indexed once, from `science10-q.js`, with their answer.

Current index: 1,435 chunks (260 textbook windows, 369 activity windows,
37 summary windows, 171 exercises, 598 board questions), 797 page-grounded.

## Configure the model

The model is **local**: the server calls Ollama at `/api/chat`. Nothing is sent
to a cloud provider, so there is no API key and no per-answer cost — but the
server must be able to reach an Ollama instance.

```sh
ollama pull qwen2.5:3b
```

| variable | default | meaning |
| --- | --- | --- |
| `UPAY_OLLAMA_URL` | `http://127.0.0.1:11434` | Ollama base URL, `http`/`https` only, no credentials in the URL |
| `UPAY_OLLAMA_MODEL` | `qwen2.5:3b` | model name; validated against a conservative pattern |
| `UPAY_SCIENCE_TUTOR` | `on` | `off` disables the route (503 `tutor_disabled`) |
| `UPAY_SCIENCE_INDEX` | — | path override for the index (tests only) |

These are server-side settings. A student request can never change the model
host or name.

### Deployment reality

- **Local / school LAN server (`node server.js`)**: works as-is with Ollama on the
  same machine. `qwen2.5:3b` (Q4) needs about 2 GB VRAM/RAM.
- **Hosted serverless (Vercel)**: `api/science/ask.js` runs the same module, but
  the function has no route to a local Ollama. Unless an operator provides a
  reachable model (for example a private HTTPS gateway that speaks the Ollama
  `/api/chat` contract), the route answers `503 tutor_unavailable` **with the
  retrieved citations**, and the UI shows "sources only". This is deliberate:
  the alternative is an ungrounded answer, which this app avoids.

## API contract

`GET /api/science/ask` — capability probe (no model host or key in the body):

```json
{"ok":true,"enabled":true,"ready":true,"model":"qwen2.5:3b",
 "index":{"available":true,"chunks":1435,"pageGrounded":797,"verifiedAnswers":171}}
```

`POST /api/science/ask`

```json
{"question":"Why are bags of chips flushed with nitrogen gas?","chapter":1,"lang":"en","history":[{"role":"user","content":"..."},{"role":"assistant","content":"..."}]}
```

Response `200`:

```json
{"ok":true,"grounded":true,"answer":"... rancid [1] ...","model":"qwen2.5:3b",
 "citations":[{"n":1,"docType":"activity","label":"NCERT · Ch 1 · Activity 1.11",
   "chapter":1,"page":12,"pageSource":"textbook-pdf","verifiedKey":false,"snippet":"..."}],
 "citationCheck":{"used":[1],"invalid":[],"hasCitation":true},
 "notice":"AI draft from a local model — check it against the cited pages; not an official answer key."}
```

Abstention (nothing matched) is still `200` with `grounded:false`,
`retrieved:0` and no answer draft.

Errors keep their evidence when retrieval succeeded:

| status | code | meaning |
| --- | --- | --- |
| 400 | `question_required` / `bad_chapter` | input rejected |
| 429 | `rate_limited` | per-address floor (shared with the AI routes) |
| 503 | `tutor_unavailable` / `tutor_model_missing` / `tutor_disabled` / `tutor_configuration` | model or config problem; `citations` still present |
| 504 | `tutor_timeout` | model exceeded its deadline |

`history` is limited to the last four turns, 600 characters each, and a
`system` role in history is never forwarded as a system message.

## Safety and honesty rules

- Sources are wrapped in `<sources>` and the system prompt says they are
  untrusted reference text; the student's question follows the closed wrapper.
  The model output is rendered as escaped text — only citation markers become
  links, invented citation numbers are flagged, not linked.
- Every chunk must have a chapter 1–13 and an id that is unique; the builder
  refuses to write an index that breaks this, and `--check` keeps it honest.
- The route needs no sign-in (it costs no provider money), but the shared
  per-IP AI floor (`lib/rate-limit.js`) bounds abuse. No prompts or user data are
  logged by this route.
- Known limit: BM25 is lexical. A syllabus-adjacent but uncovered concept (for
  example "Doppler effect" — the word "light" retrieves optics pages) is not
  reliably refused by retrieval; the system prompt is the layer that must
  decline, and the page always shows the excerpts so the student can see the
  claim is unsupported. Covered by `tools/check/science_tutor.js`.
- The index stores only public textbook/PYQ text that the app already serves.

## Verify

```sh
node tools/science-index/build_science_index.js --check
node tools/check/science_tutor.js        # index, retrieval, prompt, citations, model client, API, UI
```

`tools/check/science_tutor.js` needs no network, credentials or live model: it
starts a fake Ollama on localhost and runs the real JSDOM app for the page
flow. Both are wired into `.github/workflows/trust-checks.yml` (the JSDOM one in
the `contracts` job, alongside `build_science_index.js --check`; the Playwright
one in the `browser` job with a mocked `/api/science/ask`).
