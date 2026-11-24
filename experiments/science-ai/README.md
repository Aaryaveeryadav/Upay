# Class 10 Science AI experiments

Two **local-only research prototypes**, separate from the Upay website. Neither is ready for students or is a replacement for the existing Gemini integration. No school accounts, authorization, domain enforcement, or production safeguards are implemented. Outputs can be incorrect; teacher review is essential. Do not use student or private school data here.

## Setup on your laptop (Windows / Linux)

Install Python 3.10 or newer. In PowerShell, from this folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

If PowerShell blocks activation, use Command Prompt and `.venv\Scripts\activate.bat`, or run `.venv\Scripts\python` directly.

- `pymupdf` is recommended as the primary PDF extractor because complex NCERT vector figures (for example Chapter 5 and Chapter 6) can hit `pypdf`'s default content-stream token limit. `pypdf` remains a fallback.
- For scanned / image-only PDFs (like compressed chapter scans or scanned PYQs), install Tesseract OCR on your system `PATH` or `pip install rapidocr-onnxruntime opencv-python-headless`.
- For `tiny_model.py` / `sample.py`, install PyTorch with CUDA support for your **RTX 3050 (4 GB VRAM)** using https://pytorch.org/get-started/locally/. Verify with `python -c "import torch; print(torch.cuda.is_available())"`.

## 1. Local PDF-based tutor (Ollama + BM25)

Install Ollama from https://ollama.com/ and pull a model sized well for **4 GB VRAM**:

```powershell
ollama pull qwen2.5:3b
```

(`qwen2.5:3b` quantized Q4 uses ~1.9 GB VRAM and fits comfortably inside 4 GB VRAM alongside `num_ctx=4096`. Use `qwen2.5:1.5b` if you want faster responses or lower memory pressure. Optionally pull `nomic-embed-text` for hybrid dense+BM25 reranking via `--embed-model nomic-embed-text`.)

Put permitted textbook and PYQ PDFs in a local `pdfs/` folder (recursively supported, e.g. `pdfs/textbook/` and `pdfs/pyqs/`). Do not commit or publish PDFs unless you intend to distribute them.

### Incremental batch indexing

If you process PDFs in smaller batches:

```powershell
python tutor.py index pdfs\textbook --out science-index.json --ocr auto --ocr-fallback ..\..\assets\science\_extract.json --lang en --report
python tutor.py index pdfs\pyqs --out science-index.json --merge --ocr auto --lang en --report
python tutor.py audit --index science-index.json
```

- `--merge` preserves previously indexed files by SHA-256 hash (skipping unchanged PDFs before extraction) so you can clear processed raw PDFs between batches if needed.
- `--lang en|all` (default `en`) skips Hindi pages (Devanagari, legacy control-char/KrutiDev/Chanakya, `ToUnicode`-stripped sparse, and alternating Hindi/English scanned CBSE papers) and records `skipped_lang_pages` in `audit`.
- `eval` also accepts `--doc-type all|textbook|pyq|marking_scheme` (default `all`) to evaluate retrieval against a specific document type.

### Testing retrieval & asking questions

Test retrieval without needing Ollama running:

```powershell
python tutor.py search "Why does quicklime react vigorously with water?" --index science-index.json
python tutor.py eval --index science-index.json
```

Run the local Ollama tutor (`ask`, `chat`, or end-to-end `eval --with-llm`):

```powershell
python tutor.py ask "How is Plaster of Paris prepared from gypsum?" --index science-index.json --model qwen2.5:3b
python tutor.py chat --index science-index.json --model qwen2.5:3b
python tutor.py eval --index science-index.json --with-llm --model qwen2.5:3b
```

Retrieval uses formula-aware BM25 with section/bigram boosts and optional Ollama embedding fusion; prompts use `/api/chat` with `<sources>` isolation and low-confidence abstention, but outputs are still unverified AI drafts and must be checked against original PDFs.

## 2. Tiny Transformer trained from scratch (`tiny_model.py` + `sample.py`)

This is a **from-scratch learning experiment** (not a reliable tutor). You can export clean deduplicated text directly from your indexed PDFs:

```powershell
python tutor.py export-corpus --index science-index.json --out training.txt
```

Recommended starting settings for an **RTX 3050 (4 GB VRAM)** using built-in byte-level BPE (`--tokenizer bpe`, ~2.0M params, fp16 `--amp`):

```powershell
python tiny_model.py training.txt --tokenizer bpe --vocab-size 1024 --context 256 --width 192 --layers 4 --heads 4 --batch-size 16 --steps 1000 --amp --out tiny-model.pt
python sample.py tiny-model.pt --prompt "Chemical Reactions" --tokens 120 --temperature 0.8 --top-k 40
```

You can also run byte-level mode (`--tokenizer byte --context 128 --width 128 --layers 2`). If CUDA runs out of memory, reduce `--batch-size 8 --grad-accum 2` or `--context 128`. Do not commit `training.txt`, `science-index.json`, or `*.pt` checkpoints.

## Tests

```powershell
python -m unittest discover -s tests -v
```
