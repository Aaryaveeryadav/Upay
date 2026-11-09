# Upay — study site and Accountancy PYQs

Upay contains study pages, chapter maps, practice sets, and past-paper questions for selected Classes 10–12. Availability varies by board and subject. The CBSE Class 12 Accountancy question bank currently contains **34 papers and 1,428 question records**; official answer keys are not included, and the transcription has been spot-checked rather than exhaustively verified.

Another **17 supplied papers** (12 from 2023 Main and five from 2024 Main) are accessible as original PDFs under **Past Years → Original papers** in the CBSE Class 12 Accountancy or Computerised Accounting view. These PDFs are separate from the searchable question bank and its counts; questions from them have **not** been imported. Their scans/text layers do not reliably preserve every detail when extracted, so the source documents are provided rather than presenting unchecked OCR as verified questions. Year filters apply to the PDF list, but chapter/level filters do not. Open a PDF online and download it if you need your own offline copy; Upay's service worker does not cache these large files. The files are public site assets and will be publicly accessible if the site is deployed.

Class 12 **Economics** has 11 original bilingual study guides and the 22 English textbook chapter PDFs (six Macroeconomics and five Microeconomics, plus two Microeconomics glossaries). **The English chapter PDFs were removed and replaced by extracted text** on the same basis as English above. The 12 Hindi chapter PDFs (`lhec101–106`, `lhec201–205`, `lhec2gl`) were **kept**: they use a legacy KrutiDev font whose text layer is Latin look-alikes rather than Devanagari, so no text could be extracted. Their chapter pages say “पाठ उपलब्ध नहीं” and fall back to the Hindi study guide. Re-upload them as Unicode PDFs to extract them. These guides and review checks are not official textbook transcriptions or answer keys. Indian Economic Development books were not supplied, so this is not a claim of complete current syllabus coverage.

Class 12 **English** covers 40 selections: 13 Flamingo, six Vistas and 21 Kaleidoscope. Select Class 12 → English → Syllabus or Books, or open `/#/english12`. **The original chapter PDFs have been removed and replaced by text extracted from them**: each chapter page now shows an extracted summary (lead paragraph, section outline, expressions to notice, word count) and a **Read the full chapter** button that opens the complete extracted text. The Milton and Blake files each contained two poems and *Memories of Childhood* two accounts; both works appear as their own entries. The extracted prose is the source text with running heads, print junk and overprinted headings stripped — it has **not** been proof-read against the printed book, and textbook exercises survive only as unstructured text. Reading prompts are original study aids, not official questions or answer keys. Rebuild the extracted text with `python3 tools/extract/build-chapter-text.py`, or `--no-pdf` to regenerate from `tools/extract/.chapter-text-cache.json` alone.

Under **Past Years → Original test-paper PDFs**, the Class 12 English view also has **93 English Core and eight English Elective** supplied papers, grouped separately by course and printed series. Eighteen Core papers are 40 marks and 75 are 80 marks; one Elective paper is 40 marks and seven are 80 marks. Repeated paper codes are distinguished by series. Use the separate PDF filter to find papers by code or series; it does not search PDF contents. Eighteen Core papers are image-only scans. Three contain eight PDF pages although their covers say seven printed pages; six contain 24 PDF pages although their covers say 23; and nineteen contain 16 PDF pages although their covers say 15. Both counts are displayed. For the nineteen 16-page PDFs, the last page contains a footer and non-question marks but no question content. Years are unverified, and these original PDFs are not searchable questions or official answer keys. The year and chapter filters affect the question bank, not these whole PDFs. Download them for offline use.

For **CBSE 2026–27**, Flamingo and Vistas are used in English Core, and Kaleidoscope in English Elective. The supplied Kaleidoscope selections *Tomorrow*, *One Centimetre*, *Blood*, *On Science Fiction* and *Broken Images* are not on the 2026–27 Elective prescribed-text list; they are retained and labelled as additional readings. The PDF title *The Wild Swans at Coole* appears in the CBSE list as *The Wild Swans of Coole*. The Elective fiction novel choices were not supplied; the uploads do not cover the complete course. Check your own board and year: [CBSE English Core](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/English_core_SecP2_2026-27.pdf) · [English Elective](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/English_elective_SecP2_2026-27.pdf).

For portable Git checkouts, two existing Sanskrit paper assets use distinct filenames instead of names that differ only in letter case. Their PDF bytes are unchanged; the standalone Node server and Vercel configuration preserve the previous exact URLs.

The CBSE Class 12 Economics and Biology Past Years views also contain **90 Economics and 4 Biology original test-paper PDFs**, respectively. They remain source-only, not indexed questions or answers; repeated Economics paper codes are distinguished by printed series, and Biology 57(B) is labeled for visually impaired candidates only. Twenty-four Economics PDFs are image-only scans, clearly labeled. Twenty-one Economics PDFs contain 24 PDF pages while their covers say 23 printed pages; three contain 32 PDF pages while their covers say 31 printed pages, and three contain 12 PDF pages while their covers say 11 printed pages. Both counts are shown. The catalogue includes both 40- and 80-mark Economics papers, including all three supplied sets of series HFG1E/4. Their years are not asserted. These and the textbook PDFs are public assets when deployed, bypass the service-worker cache, and should be downloaded for offline access. Local uploaded originals and their asset hard links are read-only; modifying either link changes the other.

## Start the local server

1. Install Node.js 18 or newer.
2. From this directory run `node server.js` (or `./start.sh` on macOS/Linux, `run.bat` on Windows).
3. Open `http://localhost:8004`. The server itself does not necessarily open a browser.

On a **new installation only**, set the `UPAY_ADMIN_PASSWORD` environment variable to a strong password before starting, or the server generates a random initial admin password and prints it once to its private startup log. The local username is `admin`. The environment variable does not reset an existing database. Sign in and use **My account → Change local password**. Password changes invalidate previous local sessions.

The current `data/` directory contains private state. Do **not** serve the project root with `python -m http.server`, a generic static server, or a file-sharing service. Do not distribute the old `upay.zip`: it contains an earlier snapshot with private state. Use the Node server's public-file allowlist or a carefully prepared static deployment that excludes private files.

## AI availability

- Public study pages work without sign-in; live AI calls require an authorized account and a working Gemini key. Use the Board, Class and Subject selectors in the top bar to choose the scope; the available subjects change with the class.
- Local admin-created accounts can access the local AI service. Supabase accounts require their user IDs in the server environment variable `UPAY_AI_ALLOWED_USERS` (comma-separated). This is deliberately fail-closed because the linked project's current self-signup settings allow unverified email accounts. An allowlist is **not** production-grade rate limiting; add provider spending limits and durable abuse controls before public launch.
- For the local server, an authorized admin can configure Gemini keys under the Admin screen. A serverless deployment uses protected `GEMINI_KEYS` or `GEMINI_KEY` environment variables and `UPAY_AI_ALLOWED_USERS`; its Admin key-management endpoint is disabled.
- AI answers can be wrong. Accountancy, Economics and Class 12 English AI responses are marked **not independently checked**; no official keys are supplied. When AI is unavailable there is no verified local solver for those subjects.
- `UPAY_OPEN=1` is an insecure, explicitly opt-in demo mode that allows unauthenticated student AI requests. It never grants admin access and must not be enabled on a public deployment.
- AI caches in the local server and serverless solver are scoped to the verified account, subject, class and language. Older unowned local cache entries are preserved in `data/db.json` but are no longer reused automatically.

## Practice and backups

Mock practice is **ungraded** until complete, verified keys are available. The site records how many answers were attempted rather than inventing a score. Accountancy sample-paper AI explanations are labelled unverified and do not become answer keys. Large Past Years lists are paginated in groups of 60 to keep the page responsive; use Previous/Next and the year or chapter filters to browse the whole bank.

The **Saved → Progress backup** controls export or import the current account's saved questions, practice state and scoped mastery. Import replaces saved questions and matching practice data in the receiving account. Local practice data is separated by account, board, class and subject; it remains on the device. Guest saves and practice are not silently uploaded into a signed-in account. Signed-in Supabase saved questions may sync, but full offline/cloud reconciliation has not been verified.

Older unscoped mastery, hard-list and daily-progress data is retained in browser storage, but is not automatically assigned to a subject because its original scope is unknown. Guest backups include that legacy data. Keep a backup before clearing browser storage.

## Private data and recovery

Local runtime files are under `data/`, including `db.json` and `secret.key`; preserve them together because the secret also protects encrypted Gemini keys and signs local sessions. Rotating or deleting the secret can invalidate sessions and make stored keys unreadable. Do not share either file or old archives containing them. A clean source repository excludes these private files and is not a complete backup of runtime data or every original upload. The public PDFs included as app assets are visible to anyone who can access a public repository or deployment.

If you can still sign in, change the local password on the account page. If recovery is necessary, **stop the server first**, set a strong `UPAY_ADMIN_PASSWORD` environment variable, and run `node tools/reset-admin.js`. It updates the admin password and session version and writes a private timestamped backup without replacing older backups. Existing user content remains in the database. Do not put passwords in a command argument or shell history.

A previously exposed **legacy Supabase service-role key** and any Gemini credentials accessible through the old archive must be treated as compromised. This local app now uses the project's existing public **publishable** key; that migration does **not** revoke the exposed service-role key or any Gemini keys. Finish rotation in the provider dashboards and update the hosted environment before public launch. The server prefers `SUPABASE_PUBLISHABLE_KEY`, with `SUPABASE_ANON_KEY` retained as a legacy environment fallback; update any old override during migration. Never put a Supabase secret key or Gemini key in browser code. See `SECURITY-AND-QA.md` for the sequence and limitations. The Vercel project is deployed at https://upay-zeta.vercel.app/; see `VERCEL-FIRST-DEPLOY.md` for the owner's update and verification checklist.

## Regression checks

With the server running, Playwright and Chromium installed:

```sh
python3 tools/check/source_papers.py
python3 tools/check/source_papers_smoke.py
python3 tools/check/economics_sources.py
python3 tools/check/chapter_text.py
python3 tools/check/question_quality.py
python3 tools/check/economics_smoke.py
python3 tools/check/english12_sources.py
python3 tools/check/english12_smoke.py
python3 tools/check/english12_test_paper_sources.py
python3 tools/check/english12_test_paper_smoke.py
python3 tools/check/sanskrit_portable_smoke.py
python3 tools/check/class12_test_paper_sources.py
python3 tools/check/class12_test_paper_smoke.py
python3 tools/check/header_subject_smoke.py
python3 tools/check/accountancy_smoke.py
python3 tools/check/site_smoke.py
python3 tools/check/offline_smoke.py
python3 tools/check/auth_browser_smoke.py
python3 tools/check/backend_smoke.py
node tools/check/serverless_smoke.js
```

The source-integrity checks accept an optional `--uploads DIRECTORY` to compare the included PDFs with separately preserved originals. The browser smokes use isolated contexts; the auth/backend tests use temporary databases. Some AI responses are mocked, and a passing smoke test is not an exhaustive source audit, security audit, or guarantee of error-free operation.
