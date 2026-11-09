# Upay — Data Model Reference

What data the project currently holds, which class/collection owns it, and what type each field is.

Upay has **four separate storage layers**, and it is easy to confuse them:

| # | Layer | Where it physically lives | Written by | Who can read it |
|---|-------|---------------------------|------------|-----------------|
| 1 | **Static content bank** | `assets/js/data/*.js`, `assets/sanskrit/*.js`, `assets/science/*.js`, `assets/answers/*.json` | developers (shipped with the repo) | anyone — it is a public site asset |
| 2 | **Browser-persisted study data** | `localStorage` under the `upay.` prefix | `assets/js/app.js` | the device only |
| 3 | **Supabase cloud data** | hosted Postgres tables (`profiles`, `saved_questions`) | `assets/js/app.js` via `supabase-js` | the signed-in user (RLS) |
| 4 | **Local server state** | `data/db.json` (+ `data/secret.key`) — git-ignored | `server.js`, `api/**` | admin only |

There is **no ORM and no TypeScript**. Layers 1, 2 and 4 are plain JSON objects; their "types" are conventional and enforced only by the code that reads them. Fields are aggressively abbreviated (`cls`, `ch`, `m`, `d`, `lv`, `y`, `en`, `hi`), which is why the shapes below matter.

---

## Layer 1 — Static content bank (`window.UP`)

Every data file attaches to one global namespace object, `window.UP`, declared in `assets/js/data-extra.js`. Nothing is imported; files are concatenated by `<script>` tags from `assets/js/boot.js`.

### 1.1 Load stages (this determines what exists when)

| Stage | Trigger | Collections created |
|-------|---------|---------------------|
| `CRITICAL_CORE` | always, before first paint | `boards`, `classes`, `books`, `course11maths`, `course12maths`, `chapters`, `pyq`, `pyqMCQ`, `course12applied`, `course12accountancy`, `course12computerized`, `course12economics`, `course12english`, plus the PDF-only catalogues |
| `POST_PAINT` | after first render | `quotes`, `snippets`, `pyqOld` |
| subject pack (lazy) | on subject switch | `science10`, `socialChapters`, `hindi10Chapters`, `hindi10Rich`, `english10`/`FF`/`FP`, `sanskrit10Chapters`, `physics12`, `chemistry12`, `science10Q`, `social10Q`, `sanskritPapers`, and **most of `pyq`** |
| board pack (lazy) | board = Rajasthan | `rbseChapters`, `pyq` += RBSE maths |

`UP.pyq` is **additive** across packs — the same array grows from 3,716 records after critical core to **11,539** when every pack has loaded.

### 1.2 Registry / catalogue collections (small, hand-written)

| Collection | n | File | Fields (type) |
|---|---|---|---|
| `UP.boards` | 9 | `data-extra.js` | `id:string`, `en:string`, `hi:string`, `full:{en,hi}`, `pattern:{en,hi}`, `note:{en,hi}`, `on:boolean?` |
| `UP.classes` | 3 | `data-extra.js` | `id:number`, `en:string`, `hi:string`, `subjects:string[]` |
| `UP.subjects` | object (13 keys) | `data-extra.js` | `{ en:string, hi:string, icon:string }` per subject |
| `UP.books` | 15 | `data-extra.js` | `id:string`, `class:number`, `subject:string`, `lang:'en'\|'hi'\|'both'`, `title:{en,hi}`, `detail:{en,hi}`, `pages:number`, `loaded:boolean`, `chapters:number` |

All learner-facing strings are bilingual objects `{ en, hi }`. This is the single most consistent convention in the whole project.

### 1.3 The chapter / knowledge-base record (the "class" behind chapter pages)

Produced by `UP.catalogue(class, subject)` → one of `chapters`, `course11maths`, `course12maths`, `course12applied`, `course12accountancy`, `course12computerized`, `course12economics`, `course12english`, `hindi10Chapters`, `sanskrit10Chapters`, `socialChapters`, `science10`, or `UP.rbseChapters.chapters`.

```js
{
  id: number,                    // chapter ID — namespaced per subject, see §1.6
  en: string, hi: string,        // chapter name
  enDesc: string, hiDesc: string,
  weight: number|string,         // marks weightage; Sanskrit uses a string
  demand: string,                // "easy" | "moderate" | "exam-favourite" | "definition-heavy"
  pages: string,                 // printed page range "127–149"
  chaptersTag: { en, hi },       // topic group label
  className: 10|11|12,           // added by UP.catalogue, not stored in the file
  subject: string,               // same

  concepts: [ { t:{en,hi}, b:{en,hi} } ],                  // explanation blocks
  formulas: [ { n:{en,hi}, e:string, note?:{en,hi} } ],    // e = expression (not translated)
  pyqs:     [ { board:string, year:string, marks:number, en:string, hi:string, hiA?:true } ],
  plan:     [ { en, hi } ],                                // revision-day suggestions
  keywords: { en:string[], hi:string[] },

  // optional, per-subject extras
  book?: string, bookEn?, bookHi?, bookTitle?:{en,hi},
  displayNo?: number, n?: number, no?: number,
  sections?: [ { n, title, text } ],                       // literature: full study text
  richSections?: [ { n, title, text } ],
  exerciseGroups?: [ { name, questions:string[] } ],
  exercises?: string[], exNo?: string[], exOpts?: object, activities?: [ { n, text } ],
  figures?: [ { id, num, cap, src } ],                     // FigureRef, see §1.7
  practice?: [ { q:{en,hi}, a:{en,hi} } ],                 // economics only
  summary?/summaryHi?: string, beforeYouRead?/beforeYouReadHi?: string,
  author?: string, isPoetry?: boolean, scanned?: boolean, hasText?: boolean,
  subject:string, cls?:number
}
```

**Counts per scope** (what `UP.catalogue` returns):

| Class | Subject | n | Chapter-ID range |
|---|---|---|---|
| 10 | maths | 14 | 1–14 |
| 10 | social | 26 | 1–26 |
| 10 | english | 18 | string ids (`english10`), no numeric id |
| 10 | hindi | 42 | `hindi10Chapters` |
| 10 | sanskrit | 39 | `sanskrit10Chapters` |
| 10 | science | 13 | `science10` |
| 10 (RBSE) | maths | 19 | `rbseChapters` |
| 11 | maths | 16 | 1–16 |
| 12 | maths | 13 | 1–13 |
| 12 | applied-maths | 13 | 501–513 |
| 12 | physics | 14 | 601–614 |
| 12 | chemistry | 10 | 701–710 |
| 12 | accountancy | 10 | 101–206 |
| 12 | computerized-accounting | 2 | 301–302 |
| 12 | economics | 11 | 1101–1205 |
| 12 | english | 40 | 1501–1706 |

> Note: `UP.catalogue(10, 'science' | 'hindi' | 'sanskrit')` returns `[]`; those subjects resolve their chapters through their own arrays (`science10`, `hindi10Chapters`, `sanskrit10Chapters`) rather than the catalogue function.

### 1.4 ⭐ The question record — `UP.pyq` (the central type)

This is the heart of the app: **11,539 records** after all packs load (3,716 at first paint). Same nominal shape everywhere, but **sourced from many different imports**, so the *same field can hold different types*. This is the main thing to know.

| Field | Type | Meaning | Notes |
|---|---|---|---|
| `id` | `string` | primary key | **not unique in practice** — 25 duplicate ids exist across packs |
| `cls` | `number` | class | `10` = 6,278 · `12` = 5,261 (no class-11 questions) |
| `subject` | `string` | subject slug | see distribution below |
| `board` | `string` | `'cbse'` (10,911) · `'rajasthan'` (628) · `undefined` |
| `y` | `number` | exam year | 2010–2026 |
| `set` | `string \| number` | paper set/code, e.g. `"430/2/1"` | |
| `lv` | `string \| number` | level | `Standard` 7,003 · `Basic` 2,421 · `undefined` 1,428 · `Hard` 194 · `Praveshika` 186 · `Compartment` 4 · bare `1`/`2`/`3` |
| `q` | `number` | question number within the paper | |
| `qno` / `qn` | `number` / `string` | question number (alternate sources) | |
| `ch` | `number` | chapter ID — joins to §1.3 | **`0` = "unmapped" sentinel** (5,529 records); `null`/missing in 1,994 more |
| `chapterTags` | `number[]?` | multi-chapter questions | present on 205 |
| `chapter` | `string?` | chapter name as printed | alternate sources |
| `m` | `number \| null` | marks | 1→1,665 · 2→655 · 3→93 · 4→243 · 5→40 |
| `kind` | `number \| string \| null` | question format | see the dual scheme below |
| `d` | `number \| null` | difficulty 1–3 | most are `2` |
| `en` | `string` | question text (English) | may be spreadsheet-mangled OCR for Chemistry |
| `hi` | `string \| null` | Hindi text — **only 18.3%** have it | `null`/`""` elsewhere |
| `ans` | `string` | answer key — **only 6.7%** have it | `""` when not supplied |
| `opts` | `[{en,hi,key}] \| null \| object` | MCQ options — 13.2% | object form only in `science10` |
| `fig` | `null \| string \| FigureRef` | diagram — 3.1% | |
| `src` | `string?` | source citation, e.g. `"NCERT Chemistry U9"` | 7,133 records |
| `set`/`session`/`series`/`paperCode` | `string` | paper identity (Accountancy/English imports) | `paperCode` on 1,428 |
| `twist` | `string \| null` | twist/reword marker | |
| `part`, `sec`, `region`, `course`, `track`, `qn`, `ver`, `sa`, `n`, `option`, `figs[]`, `curriculumCode`, `curriculumCodeTags[]`, `sourceFile`, `sourcePage`, `parentSubject` | various | provenance fields used by only one import each | |

**`kind` has two incompatible schemes** — code must handle both:

- `number` (CBSE paper question numbers): `1` → 1-mark MCQ (325), `2` (112), `3` (82), `4` → 4-mark (223), `5` (97), `6` (39)
- `string` (named formats): `mcq` 2,898 · `saq` 1,888 · `sa` 1,251 · `vsa` 593 · `short` 381 · `la` 224 · `num` 162 · `case` 139 · `figure` 135 · `assertion` 95 · `reason` 83 · `define` 77 · `other` 51 · `text` 32 · `long` 16 · `numeric` 6 · **`null` 2,630**

**Question count by subject** (in `UP.pyq` after all packs):

| Subject | n | | Subject | n |
|---|---|---|---|---|
| maths | 2,802 | | english | 872 |
| chemistry | 1,750 | | science | 755 |
| social | 1,361 | | computerized-accounting | 272 |
| hindi | 1,214 | | applied-maths | 114 |
| physics | 1,181 | | sanskrit | 62 |
| accountancy | 1,156 | | | |

**Separate question-shaped arrays that are NOT in `UP.pyq`** (legacy/staging; loaded only after paint or by pack):

| Collection | n | Unique fields |
|---|---|---|
| `UP.snippets` | 2,287 | `{ c:number, l:string, t:string }` — chapter, language, text (search snippets) |
| `UP.socialPyq` | 1,036 | merges into `pyq` at pack load |
| `UP.social10Q` | 325 | `+ book, chapter, qno, ansLetter:null` |
| `UP.science10Q` | 157 | `+ book?, chapter, qno, ansLetter, fig:{id,num,cap,src}`, `opts` non-null |
| `UP.mcqKeyed` | 115 | `{ id, key:number, opts:string[], paper, src, stem, y }` |
| `UP.pyqOld` | 88 | legacy `pyq` shape |
| `UP.pyqMCQ` | 42 | answer-key supplement for `pyq` |

### 1.5 PDF / source-only catalogues

These describe **files**, not questions. Nothing here is searchable; the PDFs are public assets.

| Collection | n | Fields |
|---|---|---|
| `UP.class12OriginalTestPapers` | 195 | `id, subject, course, set:number, paperCode, series, board, cls, year:null, marks:number, duration:string, pages:number, printedPages:number, questions:number, footerCode, imageOnly:boolean, visuallyImpaired:boolean, file, originalFile, sha256, bytes:number` |
| `UP.english12Sources` | 40 | `id, book, section, chapter:number, chapterId:number, lang, file, originalFile, pages:number, sha256, bytes:number, reprint:null\|string` |
| `UP.economicsSources` | 24 | `id, book, kind:'chapter'\|'glossary', chapter:number\|null, lang, file, originalFile, pages, bytes, sha256` |
| `UP.accountancyOriginalPapers` | 17 | `year:number, session:string, paperCode, file, originalFile, pages, bytes, sha256` |
| `UP.sanskritPapers` | 9 | `id, code:number, series, set:number\|null, title:{en,hi}, marks:number, time:string, year:number\|null, file` |

On disk: **285 PDFs**, ~464 MB — `assets/papers/` 367 MB (English Core 93, English Elective 8, Accountancy 17, Economics 90, Biology 4), `assets/books/` 97 MB (Flamingo 13, Vistas 6, Kaleidoscope 21, Economics macro/micro 24, Hindi 9.7 MB, Sanskrit 9.3 MB, Science 6.7 MB).

### 1.6 Chapter-ID namespacing (important)

Chapter IDs are **only unique within a subject**. The first digit(s) encode the subject so a stale ID cannot open the wrong chapter:

| Range | Subject |
|---|---|
| `1–14` | Class 10 maths |
| `1–16` | Class 11 maths |
| `1–13` | Class 12 maths |
| `1–26` | Class 10 social |
| `101–206` | Class 12 accountancy |
| `301–302` | Computerized accounting |
| `501–513` | Applied maths |
| `601–614` | Physics |
| `701–710` | Chemistry |
| `1101–1205` | Economics |
| `1501–1706` | English |

`UP.catalogue(cls, subject)` and `chapterById(id, cls, subject)` are always called with the scope; never look up a chapter ID without it.

### 1.7 `UP.figures` — diagram resolver

`assets/js/figures.js` exports an **object of functions** (not data): `autoFigureFor(q)`, `inlineFigure(q)` etc., returning a `FigureRef`:

```js
{ id: string, num: string, cap: string, src: string }   // src = data: URI or /assets/... svg
```

### 1.8 `UP.answers` — answer cache API

`assets/js/answers.js` exports **methods**, not data: `has(id)`, `get(id)`, `set(id, answer)`, `loadSeed()`, `warm()`. Backed by `assets/answers/<subject>.json` — 13 files that are currently **all empty objects** (`{}`), so the seed bundle is a no-op and every miss falls through to the AI route.

---

## Layer 2 — Browser-persisted study data (`localStorage`)

All keys prefixed `upay.`. Written by `assets/js/app.js`; guest and signed-in data are kept apart by an owner suffix.

### 2.1 Global keys

| Key | Shape |
|---|---|
| `upay.lang` | `'en' \| 'hi'` |
| `upay.cls` | `10 \| 11 \| 12` |
| `upay.subject`, `upay.board` | subject slug / board id |
| `upay.dark`, `upay.dyslexic`, `upay.largeText`, `upay.notifAsked`, `upay.seeded`, `upay.test` | `boolean` |
| `upay.telemetry` | `boolean` — gates `navigator.sendBeacon('/api/tel')` |

### 2.2 Study data (scoped per account × board × class × subject)

Scope is a JSON key: `["<savedKey>","<board>","<cls>","<subject>"]`, so real keys look like
`upay.mastery.scope.%5B%22saved%22%2C%22cbse%22%2C10%2C%22maths%22%5D`.

| Key | Shape |
|---|---|
| `upay.saved` | `[{ q:string, date:'YYYY-MM-DD', at:number, tag:string, chapter:string, subject:string, id?:uuid }]` (≤200) |
| `upay.savedTags` | `string[]` default `['important','revisit','exam']` |
| `upay.savedFolder` | `string` (`'all'` or a tag) |
| `upay.recent` | `[{ q, subject, cls:number, board, chapter, at:number }]` (≤12) |
| `upay.progress` | `{ daily: { 'YYYY-MM-DD': number }, subjects: { <subject>: number } }` |
| `upay.mastery.scope.*` | `{ [chapterId]: { attempted:number, correct:number, at:number, cards?: SrsCard[] } }` |
| `upay.hardList.scope.*` | `string[]` |
| `upay.dailyProgress.scope.*` | `{ [questionKey]: boolean }` |
| `upay.dailySet` | `{ date:'YYYY-MM-DD', scope:string, items:[{ q, ch, chName, sourceMeta, label? }] }` (10 items) |
| `upay.mockTest` | see §2.3 |
| `upay.mockLast` | last finished mock result |

`SrsCard` (Leitner): `{ q:string, box:number, last:'YYYY-MM-DD', added:'YYYY-MM-DD' }`

### 2.3 Mock test object

```js
{
  subject: string,
  scope: string,                 // "cbse|10|maths"
  started: number,               // epoch ms
  items: Question[],             // picked questions
  answers: { [qno: number]: string },
  durations: { [qno: number]: number },
  finished: boolean,
  ungraded: true                 // always true — no verified keys exist
}
```

### 2.4 Auth & cache keys

| Key | What |
|---|---|
| `upay.token` | local-server HMAC session token (30-day) |
| `upay.user` | `{ user, role, name, mustChange }` |
| `upay.sb` | Supabase session blob |
| `upay.fyi` | dismissed notices |
| `upay.apiBase` | API origin override |
| `upay.ans.<questionId>` | one cached solved answer (see §4.1) |
| `upay.ansMeta` | `{ [id]: { at, model } }` |

---

## Layer 3 — Supabase (cloud)

Only two tables are touched, both via `assets/js/app.js` with the **publishable (anon)** key from `index.html` / `lib/supabase-public.js`. Supabase Auth (`auth.users`) supplies identity; there is no server-side user table.

### `profiles`
| Column | Type | Source |
|---|---|---|
| `id` | `uuid` PK → `auth.users.id` | Supabase Auth |
| `display_name` | `text` | "My account" form |
| `grade` | `int`/`text` | chosen class |
| `preferred_lang` | `text` — `'en' \| 'hi'` | |
| `preferred_board` | `text` | |
| `preferred_subject` | `text` | |
| `updated_at` | `timestamptz` | written explicitly on upsert |

### `saved_questions`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK, DB-generated | |
| `user_id` | `uuid` → `auth.users` | every query filters on it, in addition to RLS |
| `question_text` | `text` | mapped to local `q` |
| `subject` | `text` | |
| `chapter` | `text` | chapter *name*, not ID |
| `answer_snippet` | `text` | always inserted as `''` — unused |
| `created_at` | `timestamptz` | read back as the local `date` |

Reads are capped at `.limit(200)`; offline additions stay local as "pending" rather than being overwritten.

---

## Layer 4 — Local server state (`data/db.json`)

Single JSON document, atomic-coalesced writes (`saveDB()` with a 250 ms debounce, `fsync` + rename). Created by `freshDB()` in `server.js`. **`data/` is git-ignored** — a checkout has none of it.

```js
{
  version: 1,
  createdAt: ISO8601,
  contentUpdatedAt?: ISO8601,

  settings: {
    geminiKeySealed: string|null,   // AES blob; only ever leaves the server masked
    signupOpen: boolean,
    signupCode: string,
    signupNote: string,             // default "Class 10 Mathematics"
    geminiModel: string,            // default "gemini-3.5-flash-lite"
    siteTitle: string
  },

  users: [{
    id: string,                     // "u_admin", uid('u')
    user: string,                   // login name
    role: 'admin' | 'student',
    name: string,
    salt: string,                   // 16-byte hex
    hash: string,                   // PBKDF2-SHA256, 120,000 iters, 32 bytes
    mustChange: boolean,
    createdAt: ISO8601
  }],

  content: {
    books:  ContentItem[],
    papers: ContentItem[],
    notes:  ContentItem[],
    ai?:    GeneratedItem[]         // ≤300, admin-published AI sets
  },

  aiCache: {                        // question-hash → answer, shared by owner
    [cacheKey: string]: {
      owner: string,                // account scope
      at: ISO8601,
      model: string,
      kind?: 'translation',
      hi?: string,                  // cached Hindi translation
      /* …or a full AIAnswer object, §4.1 */
    }
  },

  aiLog: [{
    at: ISO8601,
    by?: string, user?: string,     // writer-dependent
    kind: 'solve' | 'read-image' | 'generate',
    question?: string,              // truncated to 140 chars
    chapter?: string, count?: number, level?: string,
    chars?: number, model: string,
    check?: 'unchecked' | 'verified' | …
  }],                               // capped at 100 (except read-image, which pushes)

  audit: [{ at: ISO8601, who: string, action: string, detail: string }],  // capped 500
  tel:   [{ t: ISO8601, e: string, v: number, p: object }],                // capped 500
  revoked: string[]                 // revoked session tokens (blocklist)
}
```

**`ContentItem`** (created by `POST /api/admin/content`):

```js
{
  id: string,          // uid('bo'|'pa'|'no'|'ai'…) — 2-letter kind prefix
  title: string,
  titleHi: string,
  detail: string,
  url: string,
  year: number|null,
  level: string,       // "Standard" | "Basic" | ""
  set: string,
  addedAt: ISO8601,
  addedBy: string      // username
}
```

**`GeneratedItem`** (`db.content.ai`) additionally carries `published: boolean` — only published ones are returned by the public `GET /api/content`.

Sessions themselves live in an in-memory `Map<token, {id,user,role,name,exp}>` and are therefore lost on restart; `db.revoked` persists only the blocklist.

---

## Derived / transient types (computed, never stored as such)

### 4.1 `AIAnswer` — the shape shared by solvers, cache and client

Produced by `api/ai/solve.js` and the local server route; consumed by `app.js` and cached in `aiCache` / `upay.ans.<id>`.

```js
{
  source: 'ai',
  model: string,
  questionUnderstood: string,
  result: string,                   // the final answer
  summary: string,
  verify: string,                   // how to check it
  approaches: [{
    name: string, tag: string,
    steps: [{ t:string, m:string, note:string }],
    why: string, watch: string
  }],
  diagram: object|null,             // suppressed when no official key exists
  check: { state: 'unchecked', note: string },
  generatedAt: ISO8601,
  cached?: true                     // added on cache hit
}
```

### 4.2 Generated test paper (`UP.testgen.paper`)

```js
{
  board: string, level: 'easy'|'medium'|'hard'|'mixed',
  chapters: number[]|null, title: string, time: string, total: number,
  seed: number|null,
  sections: [{
    name: string, marks: number,
    questions: [{
      no: number, ch: number, marks: number, tid: string, d: 1|2|3,
      en: string, hi: string, opts?: string[], ans: string, ansHi?: string,
      steps: [{…}], fig?: FigureRef, raw: object   // raw = the numeric parameters
    }]
  }]
}
```

### 4.3 Local solver result (`checker.js`)

`{ kind: string, values: number[], answer: string, …extra }` — e.g. `{ kind:'quadratic', values:[r1,r2], D, answer }`.

---

## Data-quality notes worth knowing before you touch this

1. **Optional by default.** Only 18.3% of questions have Hindi text; only 6.7% have an answer key; 13.2% are MCQs with options. Every renderer must tolerate `hi === ''`, `ans === ''`, `opts === null`.
2. **Two `kind` schemes** (§1.4) and two `lv` schemes (`"Standard"` strings vs bare `1`/`2`/`3`).
3. **65% of questions are not mapped to a chapter** — `ch === 0` (the "misc" sentinel set by `foldLiteratureIntoBank`) or `null`. Chapter-filtered practice silently skips them.
4. **25 duplicate `id`s** exist across packs; `foldLiteratureIntoBank` de-dupes on load, but `mcqKeyed` / `pyqMCQ` are keyed separately.
5. **Chemistry question text is damaged** — subscripts and reaction arrows were lost in the PDF text extraction (`"6 5 2 3 C H NH CHCl"` instead of `C₆H₅NH₂ + CHCl₃`).
6. **`assets/answers/*.json` are all empty**, despite the README describing pre-generated seed answers.
7. **Nothing validates the shapes.** There is no schema, no migration path and no versioning on the static bank; `db.json` has `version: 1` but no migration code. Field renaming would be a repo-wide find-and-replace.
