# The answer bank

Every question the app already carries gets **one correct answer, stored once**,
so the chat answers it instantly — with no GPU involved and no "no draft answer
this time".

## Why

The tutor used to draft every question live. When the model was offline, a
question whose answer was *already in the data* came back as a failed draft:

> Why are bags of chips flushed with nitrogen gas?
> **No draft answer this time.** The local model (Ollama) is not reachable…

That question is NCERT Class 10 Science, Ch 1, Exercise Q19, with a verified
answer. A page that cannot show it is broken, not honest.

## Three layers, in order

| Order | Source | Needs the model? | Label in the UI |
|---|---|---|---|
| 1 | A stored answer for the exact question (`lib/answer-store.js`) | No | "Stored answer" |
| 2 | The book's own answer key, when the asked question **is** the book's question | No | "Book answer key" |
| 3 | The site's own model, from retrieved excerpts | Yes | "qwen2.5:3b · N sources" |

Retrieval always runs; the citations shown are the excerpts the answer is
checked against, whatever produced it.

## Exact, not approximate

Layer 1 matches the **normalised question text** only, and layer 2 matches when
the question's content words are ≥95% the book question's and the book question
is not substantially longer. Deliberately conservative:

* "Oil and fat containing food items are flushed with nitrogen. Why?" → the
  book's key for that exercise.
* "Why are bags of chips flushed with nitrogen gas?" → not that exercise's key;
  the model answers from Ch 1 (Activity 1.11 + the exercise) in the reader's own
  terms.
* "What is the function of a nephron?" → not the key of the exercise that
  *compares* nephrons with alveoli; two shared words are not the same question.

Serving one exercise's key to another question is worse than an honest "the
model is not running": it is false confidence about the wrong answer.

## Building it

```bash
npm run answers:verified   # only the book's own keys; no model needed
npm run answers            # every question in the data, drafted by the model
npm run answers -- --scope 10:science --limit 50
npm run answers -- --refresh      # re-draft stored answers after a data change
```

`npm run answers` needs the GPU box (`UPAY_LOCAL_LLM_URL`, default
`http://127.0.0.1:11434`) and is resumable: it saves after every answer, skips
unchanged questions, and tells you if the model is unreachable instead of
storing a guess. The output is `tools/answers/answers.json`, committed so a
deployment without a GPU still answers the app's own questions.

Each record stores the question, the answer, the excerpts it was built from, a
sha256 of the question+sources, the model that wrote it (`data` for a book key)
and its status (`verified` | `drafted`). A changed source changes the hash, so a
stale answer is never served.

## Starters and board questions

The chat's starter chips are real questions from the data, so each of them has a
stored answer as soon as `npm run answers` has run once. The Practice screen
lists the board questions; asking the tutor about one from the same wording hits
layer 1.

## Not built yet

`npm run answers` has not been run against a live model in this repository
(there is no GPU here), so `answers.json` currently contains the 171 verified
NCERT keys, and layer 3 covers everything else until an operator runs it once on
the GPU box. That is the next step after the GPU is reachable.
