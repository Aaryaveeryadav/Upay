# Using your own model instead of Gemini

The site answers with whatever model you point it at. Gemini is one option; your
own model is another, and it is the shipped default. Switching is one
environment variable, and no feature code changes.

```bash
# the model you run yourself (default)
UPAY_MODEL_PROVIDER=ollama             # or openai-compatible
UPAY_LOCAL_LLM_URL=http://127.0.0.1:11434
UPAY_LOCAL_LLM_MODEL=qwen2.5:3b
```

That is the whole change. The study chat, the Science tutor and the solve route
all read it, because they all call one function: `generate()` in
`lib/model-gateway.js`.

## Why it is built this way

Before this, three pieces of code each talked to a model in their own way:
`lib/local-llm.js` for the chat, an in-file Gemini client in `server.js` with
its own key ring and model chain, and `lib/ai-provider.js` for the solve route.
"Use my own model" therefore meant a change in three places, and the three could
disagree about which model was answering. Now there is one boundary, and one
place that decides.

```
                 UPAY_MODEL_PROVIDER
                          |
                 lib/model-gateway.js          <- generate(), status()
                    /          |          \
             ollama      openai-compatible   gemini
             (/api/chat)  (/v1/chat/…)     (lib/gemini.js)
                    \          |          /
        lib/chat.js · lib/science-rag.js · lib/ai-provider.js
        (study chat)  (tutor citations)   (solve route)
```

## The compatibility contract

A model is a drop-in replacement if its server accepts this request and returns
this reply. That is the OpenAI chat-completions shape, which is what vLLM,
llama.cpp's server, LM Studio, Ollama's `/v1` endpoint, Together, Groq,
OpenRouter and Fireworks all speak.

**Request**

```http
POST /v1/chat/completions
Content-Type: application/json
Authorization: Bearer <UPAY_LLM_KEY>      # omitted on loopback

{
  "model": "your-model",
  "messages": [
    { "role": "system", "content": "…the site's teaching rules…" },
    { "role": "user",   "content": "…the question and the retrieved book pages…" }
  ],
  "temperature": 0.2,
  "max_tokens": 800,
  "stream": false
}
```

**Reply**

```json
{ "choices": [ { "message": { "role": "assistant", "content": "…the answer…" } } ] }
```

Ollama's own shapes are accepted too — `{"message":{"content":"…"}}` and
`{"response":"…"}` — so an Ollama server needs no adapter.

Anything that returns text in one of those fields will work. The site keeps its
own job: it retrieves the textbook pages, puts them in the prompt, checks that
the answer cites them, and rejects an answer that cites nothing it was given.
**Your model does not need to know about citations, chapters or the answer
bank.** It receives a prompt and returns prose.

## Choosing a provider

| `UPAY_MODEL_PROVIDER` | Talks to | Needs |
|---|---|---|
| `ollama` (default) | `POST {UPAY_LOCAL_LLM_URL}/api/chat` | `UPAY_LOCAL_LLM_URL`, `UPAY_LOCAL_LLM_MODEL` |
| `openai-compatible` | `POST UPAY_LLM_URL` | `UPAY_LLM_URL`, `UPAY_LLM_MODEL`, `UPAY_LLM_KEY` (not on loopback) |
| `gemini` | `generativelanguage.googleapis.com` | `GEMINI_KEYS` or `GEMINI_API_KEY` |
| `off` | nothing | — stored answers and the book key still answer |

The old switches still work, so an existing `.env` keeps meaning what it meant:
`UPAY_SOLVE_PROVIDER=gemini` selects Gemini, `UPAY_SOLVE_PROVIDER=local`
selects the local server.

### Serving your own model

Any of these works — pick whichever you already run:

```bash
# vLLM (a model you trained or fine-tuned)
vllm serve ./my-finetune --port 8000
UPAY_MODEL_PROVIDER=openai-compatible
UPAY_LLM_URL=http://127.0.0.1:8000/v1/chat/completions
UPAY_LLM_MODEL=./my-finetune

# llama.cpp
llama-server -m model.gguf --port 8080
UPAY_LLM_URL=http://127.0.0.1:8080/v1/chat/completions

# Ollama (the shipped default)
ollama serve && ollama pull qwen2.5:3b
UPAY_LOCAL_LLM_URL=http://127.0.0.1:11434
```

On loopback, `http://` and no key are allowed: there is no token to protect on a
socket that never leaves the machine. Any other host must be `https://` with a
`UPAY_LLM_KEY`, because the bearer token crosses the network.

### A model on another machine

Expose it through an authenticated HTTPS gateway and point `UPAY_LLM_URL` at it:

```bash
UPAY_MODEL_PROVIDER=openai-compatible
UPAY_LLM_URL=https://models.your-domain.example/v1/chat/completions
UPAY_LLM_KEY=the-gateway-token
UPAY_LLM_MODEL=class-10-tutor
# optional extra headers, one "Name: value" per line
UPAY_LLM_HEADERS=HTTP-Referer: https://upay.example
```

## What is checked, and where

`tools/check/model_gateway.js` starts a real HTTP server, points the site at it,
and drives the real handlers. It covers:

- the Ollama request shape and the model tag actually asked for;
- the OpenAI-compatible path, bearer token and extra headers;
- loopback `http` allowed, network `http` refused, credentials-in-URL refused,
  anonymous public endpoints refused;
- a down model → `llm_unavailable`, a hung model → `llm_timeout`, a 404 →
  `llm_model_missing`, an empty reply → `llm_empty`;
- upstream error text never reaching the student;
- `off` being honest, and the old switches still meaning what they did;
- **the study chat answering a real question end to end from a model that is
  not Gemini, with its citations intact**.

`tools/check/ai_provider.js` covers the solve route through the same gateway, and
`tools/check/backend_smoke.py` runs a whole isolated server against a mocked
model endpoint.

## Failure codes

Callers switch on `error.code`, not on message text:

| code | meaning | HTTP |
|---|---|---|
| `llm_unavailable` | server not reachable | 503 |
| `llm_timeout` | deadline or per-attempt timeout | 504 |
| `llm_model_missing` | 404: model tag not installed | 503 |
| `llm_configuration` | bad URL, missing key or unknown provider | 503 |
| `llm_disabled` | switched off with `UPAY_MODEL=off` or provider `off` | 503 |
| `llm_rate_limited` | upstream 429 | 429 |
| `llm_error` | upstream refused or returned junk | 502 |
| `llm_empty` | a well-formed reply with no text | 502 |

The tutor route maps these onto its own documented `tutor_*` vocabulary at
`api/science/ask.js`, so the legacy screen keeps working unchanged.
