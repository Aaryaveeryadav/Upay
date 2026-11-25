# How much has your LLM learned — and what is left

Written in plain language. Every number below was measured on the real files in
this repository, not estimated.

---

## 1. The short answer: your LLM has learned nothing yet

There has never been a training run.

Checked and confirmed:

- no model checkpoint anywhere in the project (`*.pt`, `*.gguf`, `*.safetensors`)
- no LoRA adapter folder
- no `training.txt`
- no `*.jsonl` training file
- torch is not even installed

The training scripts exist (`experiments/science-ai/lora_train.py`,
`tiny_model.py`), but nobody has ever run them to completion. So the answer to
"how much has it learned" is **zero**.

That is not a failure. Read on, because it also turns out not to matter much.

---

## 2. So why does your site already answer questions?

Because your site does **not** rely on a trained model. It does two things:

**Step 1 — find the right page.** Your database holds the whole textbook:

| what | how much |
|---|---|
| indexed passages | 1,435 |
| words of textbook text | 122,217 |
| chapters covered | all 13 |
| passages with the book's own answer key | 171 |
| passages with a citable source | 1,435 of 1,435 |

When a student asks a question, the site searches this database and pulls out
the page that answers it.

**Step 2 — let a big model read that page.** In production your site is already
set to `UPAY_MODEL_PROVIDER=gemini` with a live Gemini key. Gemini reads the
passage the site found and writes the answer in good English.

So the "Gemini-like" answer quality you want is already there — it comes from
Gemini reading *your* textbook page. The knowledge comes from your 122,217-word
database. The writing comes from Gemini.

**Nothing was ever learned. And nothing needs to be, for the answers to be correct.**

---

## 3. What I tested, and what it proved

I wrote 20 test questions and ran them against the real search engine.

**Result: 20 out of 20 correct.**

- 18 of 18 real syllabus questions found the right chapter as the **first**
  result, with the expected keyword present.
- The prompt-injection attack was blocked.
- The "capital of France" question was refused.

When I looked inside the prompt the app builds, the page it found was sitting
right there inside it — the app pastes the textbook page in and tells the model
to answer only from that. That is why answers stay on-subject.

**Translation: the searching already works. That was never the broken part.**

---

## 4. The one real hole — found and fixed

Everything passed except one case:

> "Evaluate the integral of sin(x^2) using integration by parts."

A Class 10 student asked this. Calculus is a Class 11–12 topic. It should have
been refused. **It was not** — it reached the model.

The reason is subtle. The gate tries to notice "this question is not from your
course" by checking whether the student knows the words. But a student who has
never studied calculus does not know the word "integral" — so there was nothing
for the gate to compare against, and it let the question through.

Being **out of range** (too advanced) is a different thing from being **out of
syllabus**. The gate only knew about the second one.

**The fix** (`lib/syllabus-guard.js`): a list of unmistakable mathematical
phrases — "integration by parts", "derivative of", "determinant", "binomial",
"parabola", and so on — that are refused when a Class 10 student asks them.
Class 11 and 12 students keep full access.

The fix was careful about one trap. Single words would have broken real Science
homework, because the Class 10 book uses them in ordinary non-mathematical ways:

| word | what Class 10 actually means |
|---|---|
| integral | "we are an **integral** part of the environment" |
| combination | "**combination** reaction" |
| differentiate | "fully **differentiated** cells" |
| conic | "**conical** flask" |
| limits | "this **limits** the number of trophic levels" |

So the rule matches **phrases**, never bare words, and "with respect to" only
counts when it is paired with "differentiate" — because Physics legitimately asks
about "rate of change of velocity with respect to time".

How I know it is safe: the rule was checked against **all 769 real questions in
the textbook**, and it matched **none of them**. All 17 phrases are absent from
all 1,435 passages. Both facts are now permanent tests, so if anyone later edits
the rule carelessly, the test fails.

Test score went from 19/20 to **20/20**.

---

## 5. What would training actually buy you?

Honestly: **style, not knowledge.**

A fine-tuned model on your material would learn to *sound* like a patient teacher
— shorter sentences, step-by-step wording, the tone you want. It would **not**
learn more Science, because the Science already lives in your 122,217-word
database, and the search finds the right page 18 times out of 18.

If you want the model itself to hold the knowledge, that is a much bigger project
— and it would still be worse than the page lookup you have now, because a small
model with 4 GB of video memory cannot memorise a textbook reliably.

---

## 6. What is genuinely left to do

In priority order:

**1. The training data builder is broken — do not run it as-is.**
`lora_train.py prepare` produces **1,431 training examples**, but they are not
usable:

| problem | scale |
|---|---|
| only 250 distinct question phrasings for 1,431 examples | one prompt repeated **44 times** ("Chapter 11 (figure)") |
| examples that "teach" answering a question with a dump of multiple-choice options | **297 of 1,431 (20%)** |
| previous-year-paper questions never used at all | **0 of 598** — a typo reads `doc_type` but the data says `docType` |
| answers that begin mid-word (first one starts "onsider") | 14 |
| the 171 real question-and-answer pairs the book provides are ignored | all 171 |

A model trained on this would learn to reply "Chapter 11 (figure)" and to answer
questions with a list of options. That is worse than no training at all.

**2. There are only 171 verified answers for a whole year of Science.**
These are the ones that need no model at all — the book's own answer key. When
one of these matches, the site answers instantly and for free, with no Gemini
call and no internet. Raising 171 towards the full 769 textbook questions is the
single biggest real improvement available, and it is data work, not AI work.

**3. Training can only happen on your own computer.** This sandbox has 2 CPU
cores, 3 GB of memory, no graphics card, no torch and no access to the model
download site. Your RTX 3050 with 4 GB is the right machine, and the config in
`lora_train.py` is already sized for it.

**4. Putting a trained model into the site is already solved.** You do not need
to change the app. Train, then serve it with `vllm`, `llama-server` or Ollama and
set `UPAY_MODEL_PROVIDER=openai-compatible` with `UPAY_LLM_URL`. The whole app
switches over from one setting. Today it is on `gemini`.

---

## 7. The bottom line

- **Learned so far:** nothing. No training has ever run.
- **Does that stop your site working?** No — production already runs on Gemini
  reading your textbook pages, and it scores 20/20 on the test suite.
- **Was there a real bug?** Yes, one: too-advanced maths slipped past the gate.
  It is fixed, tested and deployed.
- **Should you train now?** Not for correctness. The fix the site needed was the
  gate, not a model. If you still want the teacher's writing style, fix the data
  builder in `lora_train.py` first — otherwise the model learns garbage.
- **Biggest real win available:** more verified answers (171 today), because those
  answer instantly, for free, with no model involved.
