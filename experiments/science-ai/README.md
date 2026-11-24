# Class 10 Science AI experiments

Two **local-only research prototypes**, separate from the Upay website. Neither is ready for students or is a replacement for the existing Gemini integration. No school accounts, authorization, domain enforcement, or production safeguards are implemented. Outputs can be incorrect; teacher review is essential. Do not use student or private school data here.

## Setup on your Windows laptop

Install Python 3.10 or newer. In PowerShell, from this folder:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install pypdf
```

If PowerShell blocks activation, use Command Prompt and `.venv\Scripts\activate.bat`, or run `.venv\Scripts\python` directly. For the scratch model, install PyTorch using the current Windows/Pip/CUDA instructions at https://pytorch.org/get-started/locally/; a CPU-only install also works, but is slower. Check CUDA with `python -c "import torch; print(torch.cuda.is_available())"`. An NVIDIA driver alone does not guarantee a CUDA-enabled PyTorch installation.

## 1. Build a tiny model from scratch

Prepare a UTF-8 `training.txt` containing text you are permitted to use. Use diverse, legally usable text; a few books alone are not enough to make a useful tutor. This byte-level model starts with random weights and learns next-byte prediction, not chat or reliable reasoning.

```powershell
python tiny_model.py training.txt --steps 500 --out tiny-model.pt
python sample.py tiny-model.pt --prompt "Science is" --bytes 200
```

Training loss is not a measure of correctness. The sample may be nonsensical or contain replacement characters. 4 GB VRAM may require `--batch-size 2 --context 64`; reduce these if CUDA runs out of memory. Checkpoints are local and must only be loaded from trusted sources. Do not commit training data or checkpoints.

## 2. Local source-based tutor

Install Ollama from https://ollama.com/ on the laptop and start it, then download an open-weight model (check its license for your intended use):

```powershell
ollama pull qwen2.5:1.5b
```

Put permitted textbook and PYQ PDFs in a local `pdfs` folder. Do not commit or publish PDFs unless you intend to distribute them. Then:

```powershell
python tutor.py index pdfs --out science-index.json
python tutor.py ask "How does photosynthesis work?" --index science-index.json
```

The index is local, may contain full copyrighted text, and is ignored by Git. Use `--model` to choose another locally installed Ollama model. The prototype sends prompts only to Ollama on the same computer; model download requires internet. It does not use Gemini. For scanned PDFs, OCR is required separately; even text PDFs can extract incorrectly, so check source pages. PYQs are questions, not verified answer keys.

Retrieval uses simple keyword matching, so it can miss relevant material or retrieve irrelevant pages. It cannot reliably recognize off-topic questions, prevent prompt injection, enforce curriculum restrictions, or guarantee correct citations. PDF page numbers refer to the file, not necessarily printed page numbers. Test with teacher-reviewed in-syllabus, novel exam-style, out-of-scope and adversarial questions before considering any integration. A production version needs authenticated school-scoped retrieval, server-side access checks, proper evaluation, and reliable inference hosting; a local laptop is not a public service.
