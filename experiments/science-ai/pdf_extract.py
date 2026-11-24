"""PDF extraction, NCERT/PYQ cleaning, OCR fallback, and section-aware chunking."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

NCERT_SCIENCE_CHAPTERS = {
    1: "Chemical Reactions and Equations",
    2: "Acids, Bases and Salts",
    3: "Metals and Non-metals",
    4: "Carbon and its Compounds",
    5: "Life Processes",
    6: "Control and Coordination",
    7: "How do Organisms Reproduce?",
    8: "Heredity",
    9: "Light – Reflection and Refraction",
    10: "The Human Eye and the Colourful World",
    11: "Electricity",
    12: "Magnetic Effects of Electric Current",
    13: "Our Environment",
}

_SUBSCRIPT_DIGITS = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")

# Chemical formulas split by PDF baseline shifts (e.g. "CaCO 3", "H 2O", "CO 2").
_CHEM_JOINED_RIGHT_RE = re.compile(r"\b((?:[A-Z][a-z]?\d*)+)\s+(\d{1,2})(?=[A-Z\(])")
_CHEM_MULTICAP_LEFT_RE = re.compile(r"\b([A-Z][a-z]?[A-Z][A-Za-z0-9\(\)]*)\s+(\d{1,2})(?=(?:\s|[+\-→=()]|$))")
_CHEM_CLOSE_PAREN_GAP_RE = re.compile(r"\)\s+(\d{1,2})(?=(?:\s|[+\-→=()]|$))")
_CHEM_STATE_GAP_RE = re.compile(r"([A-Za-z0-9\)])\s*\(\s*(aq|s|l|g)\s*\)")

_HEADING_PATTERNS = [
    re.compile(r"^(\d+\.\d+(?:\.\d+)?)\s+([A-Z][A-Za-z0-9 ,\-–'’()/]+)$"),
    re.compile(r"^(Activity\s+\d+\.\d+)\b", re.IGNORECASE),
    re.compile(r"^(Example\s+\d+\.\d+)\b", re.IGNORECASE),
    re.compile(r"^(QUESTIONS|EXERCISES|What you have learnt|More to Know!|Do You Know\?)\b"),
    re.compile(r"^(SECTION\s+[A-E]\b.*)$", re.IGNORECASE),
    re.compile(r"^(Sample Case Studies?)\b", re.IGNORECASE),
    re.compile(r"^(Answer Key)\b", re.IGNORECASE),
]

# Symbol-font PUA glyphs (extracted as U+F0xx) -> real math symbols.
# Symbol encoding: 0xAE = right arrow, 0xB0 = degree, 0xD7 = multiplication.
_SYMBOL_PUA_MAP: dict[str, str] = {
    "\uf0ae": "→",
    "\uf0b0": "°",
    "\uf0d7": "×",
    "\uf8ae": "→",
    "\uf8b0": "°",
    "\uf8d7": "×",
    "\uf0af": "↓",
    "\uf0ac": "←",
    "\uf0ad": "↑",
    "\uf0ab": "↔",
}
_SYMBOL_PUA_TRANS = str.maketrans(_SYMBOL_PUA_MAP)

# KrutiDev / Chanakya ASCII-Hindi markers (legacy Hindi fonts mapped onto Latin keys).
KRUTIDEV_MARKERS = ("H$", "Ho$", "Am¡a", "CÎma", "àíZ")

# Roman numerals that appear on Hindi cover/contents pages and must be ignored
# when deciding whether a sparse page is ToUnicode-stripped Hindi.
_ROMAN_NUMERAL_RE = re.compile(r"\b(?:iii|vii|viii|ii|iv|vi|ix|x)\b", re.IGNORECASE)
_DEVANAGARI_RE = re.compile(r"[\u0900-\u097f]")
_ENGLISH_WORD_RE = re.compile(r"[A-Za-z]{3,}")


def _devanagari_count(text: str) -> int:
    return len(_DEVANAGARI_RE.findall(text or ""))


def _is_devanagari_page(text: str) -> bool:
    """Unicode Devanagari Hindi page."""
    if not text:
        return False
    count = _devanagari_count(text)
    if count >= 8:
        return True
    # Ratio check for short pages.
    stripped = text.strip()
    if stripped and count >= 3 and count / max(1, len(stripped)) > 0.05:
        return True
    return False


def _is_legacy_control_hindi_page(text: str) -> bool:
    """Legacy Hindi fonts that extract as control characters (no ToUnicode)."""
    if not text:
        return False
    ctrl = sum(1 for ch in text if (ord(ch) < 32 and ch not in "\n\t\r") or 0x7F <= ord(ch) <= 0x9F)
    if ctrl >= 4:
        return True
    # Many private-use / replacement glyphs with almost no English words.
    pua = sum(1 for ch in text if 0xE000 <= ord(ch) <= 0xF8FF)
    if pua >= 8 and len(_ENGLISH_WORD_RE.findall(text)) < 3:
        return True
    return False


def _is_krutidev_hindi_page(text: str) -> bool:
    """KrutiDev/Chanakya ASCII-Hindi pages (H$, Ho$, Am¡a, CÎma, àíZ)."""
    if not text:
        return False
    return any(marker in text for marker in KRUTIDEV_MARKERS)


def _is_tounicode_sparse_hindi_page(text: str) -> bool:
    """ToUnicode-stripped sparse Hindi page.

    Such pages extract as very sparse gibberish: few English words and a
    noticeable amount of non-ASCII / symbol characters. Roman numerals
    (iii/vii/viii/...) on cover pages are ignored so a contents page that
    only lists roman numerals is not misclassified on that alone.
    """
    if not text:
        return False
    # Ignore roman numerals before judging sparseness.
    cleaned = _ROMAN_NUMERAL_RE.sub(" ", text)
    english_words = _ENGLISH_WORD_RE.findall(cleaned)
    non_ascii = sum(1 for ch in cleaned if ord(ch) > 127)
    total_chars = len(cleaned.strip())
    if total_chars == 0:
        return False
    # Sparse: very few English words but some non-ASCII gibberish.
    if len(english_words) <= 2 and non_ascii >= 3 and total_chars < 400:
        return True
    if len(english_words) <= 4 and non_ascii >= 8 and total_chars < 600:
        return True
    # Almost no alphabetic English at all but non-ASCII present.
    alpha = sum(1 for ch in cleaned if ch.isalpha() and ord(ch) < 128)
    if alpha < 10 and non_ascii >= 4:
        return True
    return False


def _is_hindi_page(text: str) -> bool:
    """True if a page looks like Hindi (any of the known Hindi encodings)."""
    if not text or not text.strip():
        return False
    return (
        _is_devanagari_page(text)
        or _is_legacy_control_hindi_page(text)
        or _is_krutidev_hindi_page(text)
        or _is_tounicode_sparse_hindi_page(text)
    )


def _looks_english_page(text: str) -> bool:
    if not text:
        return False
    return len(_ENGLISH_WORD_RE.findall(text)) >= 5 and not _is_devanagari_page(text)


def _detect_alternating_hindi_even(page_texts: list[str]) -> bool:
    """Auto-detect alternating Hindi(even)/English(odd) scanned CBSE papers.

    ``page_texts`` is 0-indexed in order; page numbers are 1-indexed, so
    even pages are indices 1, 3, 5, ...  Returns True when even pages are
    predominantly Hindi-like and odd pages predominantly English-like.
    Requires at least 4 pages so a single Hindi page cannot trigger it.
    """
    if len(page_texts) < 4:
        return False
    even = page_texts[1::2]
    odd = page_texts[0::2]
    if not even or not odd:
        return False
    even_hindi = sum(1 for t in even if _is_hindi_page(t))
    odd_english = sum(1 for t in odd if _looks_english_page(t))
    odd_hindi = sum(1 for t in odd if _is_hindi_page(t))
    # Even pages mostly Hindi, odd pages mostly English and not Hindi.
    return even_hindi >= max(1, len(even) // 2) and odd_english >= max(1, len(odd) // 2) and odd_hindi == 0


@dataclass
class FileReport:
    source: str
    sha256: str
    doc_type: str
    chapter: int | None
    chapter_title: str | None
    pages: int
    digital_pages: int
    ocr_pages: int
    empty_pages: int
    chars: int
    chunks: int
    extraction_methods: list[str]
    warnings: list[str]
    skipped_lang_pages: int = 0


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def discover_pdfs(target: Path) -> list[Path]:
    if target.is_file():
        return [target] if target.suffix.lower() == ".pdf" else []
    if target.is_dir():
        return sorted(p for p in target.rglob("*.pdf") if p.is_file())
    return []


def detect_chapter_info(filename: str, sample_text: str = "") -> tuple[int | None, str | None, str]:
    low = filename.lower()
    if any(tok in low for tok in ("marking", "solution", "ms_", "_ms", "anskey", "answer-key")):
        doc_type = "marking_scheme"
    elif any(
        tok in low
        for tok in ("pyq", "paper", "qp", "sample", "sqp", "board", "31_", "31-", "sciencex", "case")
    ):
        doc_type = "pyq"
    else:
        m = re.search(r"(?:chapter[-_ ]?|jesc1)(\d{1,2})(?=\D|$)", low)
        if m:
            ch = int(m.group(1))
            if ch in NCERT_SCIENCE_CHAPTERS:
                return ch, NCERT_SCIENCE_CHAPTERS[ch], "textbook"
        doc_type = "other"

    if sample_text:
        head = sample_text[:1200]
        if "marking scheme" in head.lower() or "expected answer" in head.lower():
            doc_type = "marking_scheme"
        elif any(k in head.lower() for k in ("time allowed", "maximum marks", "general instructions", "q.p. code")):
            doc_type = "pyq"
        else:
            m_ch = re.search(r"\bCHAPTER\s*(\d{1,2})\b", head)
            if m_ch:
                ch = int(m_ch.group(1))
                if ch in NCERT_SCIENCE_CHAPTERS:
                    return ch, NCERT_SCIENCE_CHAPTERS[ch], "textbook"
            for ch, title in NCERT_SCIENCE_CHAPTERS.items():
                prefix = title.lower().split("–")[0].strip()
                # Require word boundaries so e.g. "sunlight" does not match
                # the "Light" chapter (Ch 9) via a substring search.
                if re.search(r"\b" + re.escape(prefix) + r"\b", head.lower()):
                    return ch, title, "textbook"
    return None, None, doc_type


def _stitch_overlapping_text(left: str, right: str, min_overlap: int = 1) -> str:
    """Merge partial overprinted spans whose suffix/prefix overlap (e.g. CHEMIC + ANDING...).

    ``min_overlap=1`` (default) stitches column-cut words that share as
    little as a single character on the same baseline, e.g. a word split
    across two touching PDF blocks as ``Calciu`` + ``m oxide`` style
    fragments with a one-character overlap.
    """
    if not left:
        return right
    if not right:
        return left
    max_ov = min(len(left), len(right))
    for k in range(max_ov, min_overlap - 1, -1):
        if left.endswith(right[:k]):
            return left + right[k:]
    return right if len(right) >= len(left) else left


def _join_column_parts(left: str, right: str, *, gap: float = 0.0, size: float = 10.0) -> str:
    """Join two same-baseline fragments from horizontally touching blocks.

    Stitches overlapping column-cut words (``min_overlap=1``); otherwise
    inserts a space only when the horizontal gap is large enough.
    """
    if not left:
        return right
    if not right:
        return left
    max_ov = min(len(left), len(right))
    for k in range(max_ov, 0, -1):
        if left.endswith(right[:k]):
            return left + right[k:]
    if gap <= max(1.5, size * 0.18):
        return left + right
    if left.endswith(" ") or right.startswith(" "):
        return left + right
    return left + " " + right


def _blocks_touch_horizontally(a: tuple[float, float, float, float], b: tuple[float, float, float, float]) -> bool:
    """Union-find predicate: y-overlap > 1.0pt and horizontal gap < 14.0pt.

    Blocks separated by >= 14pt are kept separate so multi-column
    sidebars / marginalia do not get merged into the main column.
    """
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    y_ov = min(ay1, by1) - max(ay0, by0)
    if y_ov <= 1.0:
        return False
    x_gap = max(0.0, max(ax0 - bx1, bx0 - ax1))
    return x_gap < 14.0


def _union_find_groups(bboxes: list[tuple[float, float, float, float]]) -> list[list[int]]:
    """Group block indices with union-find over horizontally touching blocks."""
    n = len(bboxes)
    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        rx, ry = find(x), find(y)
        if rx != ry:
            parent[ry] = rx

    for i in range(n):
        for j in range(i + 1, n):
            if _blocks_touch_horizontally(bboxes[i], bboxes[j]):
                union(i, j)
    groups: dict[int, list[int]] = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    # Deterministic reading order: by top, then left of each group.
    ordered = sorted(groups.values(), key=lambda g: (min(bboxes[i][1] for i in g), min(bboxes[i][0] for i in g)))
    for g in ordered:
        g.sort(key=lambda i: (bboxes[i][1], bboxes[i][0]))
    return ordered


def _extract_page_pymupdf(page: Any) -> str:
    d = page.get_text("dict")
    raw_blocks = [b for b in d.get("blocks", []) if "lines" in b]
    if not raw_blocks:
        return ""

    bboxes = [
        (float(b["bbox"][0]), float(b["bbox"][1]), float(b["bbox"][2]), float(b["bbox"][3]))
        for b in raw_blocks
    ]
    groups = _union_find_groups(bboxes)

    blocks_out: list[str] = []
    for grp in groups:
        spans = []
        for bi in grp:
            b = raw_blocks[bi]
            for ln in b["lines"]:
                for s in ln.get("spans", []):
                    txt = s.get("text", "")
                    if not txt.strip():
                        continue
                    x0, _, x1, _ = s["bbox"]
                    ox, oy = s["origin"]
                    spans.append((oy, ox, x0, x1, float(s.get("size", 10.0)), txt))
        if not spans:
            continue

        # Cluster spans sharing a visual baseline (keeps sub/superscripts on the same row).
        spans.sort(key=lambda s: (s[0], s[2]))
        rows: list[list[tuple[float, float, float, float, float, str]]] = []
        for sp in spans:
            if not rows or abs(sp[0] - rows[-1][0][0]) > 4.8:
                rows.append([sp])
            else:
                rows[-1].append(sp)

        lines_out: list[str] = []
        for row in rows:
            # Remove NCERT 5x overprinted bold headings and partial duplicate strokes.
            row_by_len = sorted(row, key=lambda s: (-(s[3] - s[2]), -len(s[5])))
            kept: list[tuple[float, float, float, float, float, str]] = []
            for sp in row_by_len:
                oy, ox, x0, x1, sz, txt = sp
                t_norm = re.sub(r"\s+", "", txt)
                w = max(1e-3, x1 - x0)
                replaced = False
                skip = False
                for idx, ksp in enumerate(kept):
                    koy, kox, kx0, kx1, ksz, ktxt = ksp
                    overlap = max(0.0, min(x1, kx1) - max(x0, kx0))
                    if overlap <= 1.0:
                        continue
                    k_norm = re.sub(r"\s+", "", ktxt)
                    if overlap / w > 0.65 and (t_norm == k_norm or t_norm in k_norm):
                        skip = True
                        break
                    # Handle partial shifted strokes covering adjacent chunks of one heading.
                    if overlap > 8.0 and abs(oy - koy) < 2.5:
                        merged = (
                            _stitch_overlapping_text(ktxt, txt)
                            if kx0 <= x0
                            else _stitch_overlapping_text(txt, ktxt)
                        )
                        if len(merged) >= max(len(ktxt), len(txt)):
                            kept[idx] = (
                                min(oy, koy),
                                min(ox, kox),
                                min(x0, kx0),
                                max(x1, kx1),
                                max(sz, ksz),
                                merged,
                            )
                            replaced = True
                            break
                if not skip and not replaced:
                    kept.append(sp)

            kept.sort(key=lambda s: s[2])
            line_str = ""
            prev_x1: float | None = None
            for _, _, x0, x1, sz, txt in kept:
                if not line_str:
                    line_str = txt
                else:
                    gap = x0 - (prev_x1 if prev_x1 is not None else x0)
                    line_str = _join_column_parts(line_str, txt, gap=gap, size=sz)
                prev_x1 = x1
            line = line_str.strip()
            if line:
                lines_out.append(line)
        if lines_out:
            blocks_out.append("\n".join(lines_out))
    return "\n\n".join(blocks_out)


def clean_extracted_text(text: str, doc_type: str = "textbook") -> str:
    if not text:
        return ""
    text = (
        text.replace("\r\n", "\n")
        .replace("\r", "\n")
        .translate(_SUBSCRIPT_DIGITS)
        .translate(_SYMBOL_PUA_TRANS)
    )
    # Strip remaining Adobe/Symbol PUA arrow-extension glyphs (e.g. →) around reaction arrows.
    text = re.sub(r"[\uf000-\uf8ff]+", " ", text)

    # Collapse vertical or spaced banners (Q U E S T I O N S -> QUESTIONS).
    text = re.sub(r"Q\s*\n\s*U\s*\n\s*E\s*\n\s*S\s*\n\s*T\s*\n\s*I\s*\n\s*O\s*\n\s*N\s*\n\s*S(?:\s*\n\s*\?)?", "QUESTIONS", text)
    text = re.sub(r"E\s*\n\s*X\s*\n\s*E\s*\n\s*R\s*\n\s*C\s*\n\s*I\s*\n\s*S\s*\n\s*E\s*\n\s*S", "EXERCISES", text)
    text = re.sub(r"\bQ\s+U\s+E\s+S\s+T\s+I\s+O\s+N\s+S\b", "QUESTIONS", text)
    text = re.sub(r"\bE\s+X\s+E\s+R\s+C\s+I\s+S\s+E\s+S\b", "EXERCISES", text)
    # Join split QUESTIONS1 -> QUESTIONS\n1.
    text = re.sub(r"\bQUESTIONS(\d+)\b", r"QUESTIONS\n\1.", text)
    # Repair noisy OCR headings seen in compressed scans of Ch 4 and Ch 8.
    text = re.sub(r"\bOUVEsTtILO\s*WN\s*\n*\s*S\b", "QUESTIONS", text)
    text = re.sub(r"\bO\s*VEST\s*LON\s*'s\b", "QUESTIONS", text)
    text = re.sub(r"\bMe\s+XER\s+CHISE\s+S\s*\|?\s*:?", "EXERCISES", text)
    text = re.sub(r"\boer\s+cHapTERa\b", "CHAPTER", text)
    text = re.sub(r"\b2\s+Bad\s+Carbon\b", "Carbon", text)
    text = re.sub(r"\bEl:\s+Compounds\b", "Compounds", text)
    text = re.sub(r"\be-«s\|\s*Heredity\b", "Heredity", text)

    lines = [ln.strip() for ln in text.split("\n")]

    # Merge NCERT chapter opening drop caps: single uppercase letter + optional blank + lowercase start.
    merged_lines: list[str] = []
    i = 0
    while i < len(lines):
        cur = lines[i]
        if re.fullmatch(r"[A-Z]", cur):
            nxt_idx = i + 1
            while nxt_idx < len(lines) and not lines[nxt_idx]:
                nxt_idx += 1
            if nxt_idx < len(lines) and re.match(r"^[a-z]", lines[nxt_idx]):
                merged_lines.append(cur + lines[nxt_idx])
                i = nxt_idx + 1
                continue
        merged_lines.append(cur)
        i += 1

    # Strip running headers/footers, PYQ watermarks/covers, and repeated lines.
    cleaned_lines: list[str] = []
    chapter_title_norms = {t.lower().replace("–", "-") for t in NCERT_SCIENCE_CHAPTERS.values()}
    prev_nonempty = ""
    in_pyq_instructions = False
    for ln in merged_lines:
        if not ln:
            if cleaned_lines and cleaned_lines[-1] != "":
                cleaned_lines.append("")
            continue
        if doc_type in ("pyq", "marking_scheme"):
            # CBSE PYQ watermarks / headers / footers
            if re.fullmatch(r"\*\s*31(?:/[A-Za-z0-9]+)*\s*\*?", ln):
                continue
            if re.fullmatch(r"\*?\s*ECNEICS\s*\*?", ln, re.I):
                continue
            if re.fullmatch(r"\[\s*P\.?\s*T\.?\s*O\.?\s*\]", ln, re.I):
                continue
            if re.fullmatch(r"H\s*\d+\s*H", ln):
                continue
            if re.fullmatch(r"\[\s*\]", ln):
                continue
            # Strip General Instructions block before SECTION A or Q1
            if re.match(r"^General Instructions\b", ln, re.I):
                in_pyq_instructions = True
                continue
            if in_pyq_instructions:
                if re.match(r"^(?:SECTION\s+[A-E]\b|Q\.?\s*1\b|1\.)", ln, re.I):
                    in_pyq_instructions = False
                else:
                    continue
        # Running NCERT footers & codes
        if re.fullmatch(r"20\d{2}-\d{2}", ln) or re.fullmatch(r"Reprint\s+20\d{2}-\d{2}", ln, re.I):
            continue
        if re.fullmatch(r"10\d{2}CH\d{2}", ln, re.I):
            continue
        if re.fullmatch(r"(?:\d+\s+)?Science(?:\s+\d+)?", ln):
            continue
        if re.fullmatch(r"\d{1,3}", ln) and doc_type == "textbook":
            continue
        # Chapter running headers like "101 Control and Coordination" or "Chemical Reactions and Equations 3"
        ln_no_num = re.sub(r"(?:^\d+\s+|\s+\d+$)", "", ln).strip().lower().replace("–", "-")
        if doc_type == "textbook" and ln_no_num in chapter_title_norms and re.search(r"(?:^\d+\s+|\s+\d+$)", ln):
            continue
        # Fix Wingdings square bullets extracted as stray "n " or "= "
        ln = re.sub(r"^(?:n|=)\s+", "- ", ln)
        # Skip immediate duplicate lines (remaining overprint artifacts)
        if ln == prev_nonempty:
            continue
        cleaned_lines.append(ln)
        prev_nonempty = ln

    # Join standalone question numbers ("1." or "Q.1") and option markers ("(a)", "(A)", "(i)")
    # with the following non-empty line.
    joined_q_lines: list[str] = []
    idx = 0
    while idx < len(cleaned_lines):
        cur = cleaned_lines[idx]
        if (
            re.fullmatch(r"(?:Q\.?\s*)?\d+\.", cur)
            or re.fullmatch(r"\([a-dA-D]|[ivxIVX]+\)", cur)
            or re.fullmatch(r"\((?:[a-dA-D]|[ivxIVX]+)\)", cur)
        ):
            nxt = idx + 1
            while nxt < len(cleaned_lines) and not cleaned_lines[nxt]:
                nxt += 1
            if nxt < len(cleaned_lines):
                joined_q_lines.append(f"{cur} {cleaned_lines[nxt]}")
                idx = nxt + 1
                continue
        joined_q_lines.append(cur)
        idx += 1

    joined = "\n".join(joined_q_lines)
    # Rejoin hyphenated line breaks in prose (avoid chemical/number hyphens).
    joined = re.sub(r"([A-Za-z]{2,})-\n([a-z]{2,})", r"\1\2", joined)

    # Repair chemical formulas split by subscript gaps, e.g. "CaCO 3" -> "CaCO3", "H 2O" -> "H2O".
    for _ in range(3):
        joined = _CHEM_JOINED_RIGHT_RE.sub(r"\1\2", joined)
        joined = _CHEM_MULTICAP_LEFT_RE.sub(r"\1\2", joined)
        joined = _CHEM_CLOSE_PAREN_GAP_RE.sub(r")\1", joined)
    joined = _CHEM_STATE_GAP_RE.sub(r"\1(\2)", joined)
    joined = re.sub(r"\b([A-Z][a-z]?\d*)\s+([A-Z][a-z]?\d*O\d*)\b", lambda m: m.group(0), joined)
    joined = re.sub(r"\bH2\s+O\b", "H2O", joined)
    joined = re.sub(r"\bCO\s+2\b", "CO2", joined)
    joined = re.sub(r"\bSO\s+4\b", "SO4", joined)
    joined = re.sub(r"\bH2\s+SO4\b", "H2SO4", joined)
    joined = re.sub(r"\bFe3\s+O4\b", "Fe3O4", joined)
    joined = re.sub(r"\bFe2\s+O3\b", "Fe2O3", joined)
    joined = re.sub(r"\bCa\(HCO3\)\s*2\b", "Ca(HCO3)2", joined)
    joined = re.sub(r"\n{3,}", "\n\n", joined)
    return joined.strip()


def load_ocr_fallback_map(path: Path | None) -> dict[int, list[dict[str, Any]]]:
    if not path or not path.exists():
        return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    out: dict[int, list[dict[str, Any]]] = {}
    if isinstance(raw, list):
        for entry in raw:
            ch = entry.get("chapter")
            pages = entry.get("pages")
            if isinstance(ch, int) and isinstance(pages, list):
                out[ch] = pages
    return out


def _ocr_page_image(page: Any, mode: str, rapid_engine_box: list[Any]) -> tuple[str, str]:
    """Run local OCR on a rendered page image when digital text is absent."""
    use_tess = mode in ("auto", "tesseract") and shutil.which("tesseract") is not None
    if use_tess:
        pix = page.get_pixmap(dpi=250)
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name
        try:
            pix.save(tmp_path)
            proc = subprocess.run(
                ["tesseract", tmp_path, "stdout", "--psm", "6"],
                capture_output=True,
                text=True,
                timeout=60,
                check=False,
            )
            if proc.returncode == 0 and proc.stdout.strip():
                return proc.stdout, "ocr-tesseract"
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
    if mode in ("auto", "rapidocr"):
        try:
            import numpy as np
            from rapidocr_onnxruntime import RapidOCR  # type: ignore
        except ImportError:
            return "", "empty"
        if not rapid_engine_box:
            rapid_engine_box.append(RapidOCR())
        pix = page.get_pixmap(dpi=250)
        img = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, pix.n)
        res, _ = rapid_engine_box[0](img)
        if res:
            return "\n".join(item[1] for item in res), "ocr-rapidocr"
    return "", "empty"


def _detect_heading(line: str) -> str | None:
    s = line.strip()
    if not s or len(s) > 100:
        return None
    for pat in _HEADING_PATTERNS:
        if pat.match(s):
            return s
    return None


def chunk_pages(
    pages_data: list[dict[str, Any]],
    *,
    source: str,
    doc_type: str,
    chapter: int | None,
    chapter_title: str | None,
    target_words: int = 180,
    overlap_words: int = 35,
) -> list[dict[str, Any]]:
    """Build section-aware, page-grounded chunks from extracted page records."""
    chunks: list[dict[str, Any]] = []
    current_section = chapter_title or "Introduction"

    for pg in pages_data:
        page_no = int(pg["page"])
        method = pg.get("method", "digital")
        text = pg.get("text", "").strip()
        if not text:
            continue

        paragraphs = [p.strip() for p in re.split(r"\n{2,}", text) if p.strip()]
        if doc_type in ("pyq", "marking_scheme"):
            # Split PYQs gently near numbered questions if paragraphs are huge.
            expanded: list[str] = []
            for p in paragraphs:
                parts = re.split(r"(?=(?:^|\n)\s*(?:Q\.?\s*\d+|\d+\.)\s+)", p)
                expanded.extend(part.strip() for part in parts if part.strip())
            paragraphs = expanded

        buf_words: list[str] = []
        buf_section = current_section

        def flush_buffer() -> None:
            if not buf_words:
                return
            chunk_text = " ".join(buf_words).strip()
            if len(chunk_text) < 20:
                return
            chunks.append(
                {
                    "id": f"{source}#p{page_no}-{len(chunks) + 1}",
                    "source": source,
                    "page": page_no,
                    "doc_type": doc_type,
                    "chapter": chapter,
                    "chapter_title": chapter_title,
                    "section": buf_section,
                    "extraction_method": method,
                    "text": chunk_text,
                }
            )

        for para in paragraphs:
            first_line = para.splitlines()[0].strip()
            heading = _detect_heading(first_line)
            if heading and buf_words and len(buf_words) >= 40:
                flush_buffer()
                buf_words = []
            if heading:
                current_section = heading
                buf_section = current_section

            para_words = para.split()
            if len(para_words) > target_words + 40:
                # Split oversized paragraph into overlapping windows within the same page.
                if buf_words:
                    flush_buffer()
                    buf_words = []
                step = max(40, target_words - overlap_words)
                for start in range(0, len(para_words), step):
                    win = para_words[start : start + target_words]
                    if not win:
                        break
                    chunks.append(
                        {
                            "id": f"{source}#p{page_no}-{len(chunks) + 1}",
                            "source": source,
                            "page": page_no,
                            "doc_type": doc_type,
                            "chapter": chapter,
                            "chapter_title": chapter_title,
                            "section": current_section,
                            "extraction_method": method,
                            "text": " ".join(win),
                        }
                    )
                    if start + target_words >= len(para_words):
                        break
                continue

            if buf_words and len(buf_words) + len(para_words) > target_words:
                tail = buf_words[-overlap_words:] if overlap_words > 0 else []
                flush_buffer()
                buf_words = list(tail)
                buf_section = current_section

            buf_words.extend(para_words)

        flush_buffer()

    return chunks


def extract_pdf_file(
    pdf_path: Path,
    *,
    rel_source: str | None = None,
    ocr_mode: str = "none",
    ocr_fallback_map: dict[int, list[dict[str, Any]]] | None = None,
    lang: str = "en",
) -> tuple[list[dict[str, Any]], FileReport]:
    """Extract, clean, audit, and chunk a single PDF file."""
    source_name = rel_source or pdf_path.name
    file_hash = sha256_file(pdf_path)
    warnings: list[str] = []
    raw_pages: list[dict[str, Any]] = []
    methods_used: list[str] = []
    rapid_box: list[Any] = []
    skipped_lang_pages = 0
    seen_page_texts: list[str] = []

    try:
        import pymupdf  # type: ignore

        doc = pymupdf.open(str(pdf_path))
        page_count = len(doc)
        first_sample = doc[0].get_text("text") if page_count > 0 else ""
        ch_num, ch_title, doc_type = detect_chapter_info(pdf_path.name, first_sample)

        fallback_pages = None
        if ocr_fallback_map and ch_num in ocr_fallback_map:
            cand = ocr_fallback_map[ch_num]
            if len(cand) == page_count:
                fallback_pages = {int(p["page"]): p.get("text", "") for p in cand}

        for idx, page in enumerate(doc, 1):
            txt = _extract_page_pymupdf(page)
            method = "pymupdf"
            if len(txt.strip()) < 30:
                if (
                    lang == "en"
                    and idx % 2 == 0
                    and len(seen_page_texts) >= 3
                    and _detect_alternating_hindi_even(seen_page_texts)
                ):
                    skipped_lang_pages += 1
                    seen_page_texts.append("")
                    continue
                if fallback_pages and idx in fallback_pages and fallback_pages[idx].strip():
                    txt = fallback_pages[idx]
                    method = "ocr-fallback"
                elif ocr_mode != "none":
                    ocr_txt, ocr_m = _ocr_page_image(page, ocr_mode, rapid_box)
                    if ocr_txt.strip():
                        txt = ocr_txt
                        method = ocr_m
                    else:
                        method = "empty"
                else:
                    method = "empty"
            seen_page_texts.append(txt)
            if lang == "en" and _is_hindi_page(txt):
                skipped_lang_pages += 1
                continue
            cleaned = clean_extracted_text(txt, doc_type=doc_type)
            raw_pages.append({"page": idx, "text": cleaned, "method": method})
            if method not in methods_used:
                methods_used.append(method)
    except ImportError:
        from pypdf import PdfReader

        reader = PdfReader(str(pdf_path))
        page_count = len(reader.pages)
        first_sample = ""
        if page_count > 0:
            try:
                first_sample = reader.pages[0].extract_text() or ""
            except Exception as exc:
                warnings.append(f"page 1 pypdf error: {type(exc).__name__}")
        ch_num, ch_title, doc_type = detect_chapter_info(pdf_path.name, first_sample)

        fallback_pages = None
        if ocr_fallback_map and ch_num in ocr_fallback_map:
            cand = ocr_fallback_map[ch_num]
            if len(cand) == page_count:
                fallback_pages = {int(p["page"]): p.get("text", "") for p in cand}

        for idx, page in enumerate(reader.pages, 1):
            txt = ""
            method = "pypdf"
            try:
                txt = page.extract_text() or ""
            except Exception as exc:
                warnings.append(f"page {idx} pypdf error: {type(exc).__name__}")
                method = "pypdf-error"
            if len(txt.strip()) < 30:
                if fallback_pages and idx in fallback_pages and fallback_pages[idx].strip():
                    txt = fallback_pages[idx]
                    method = "ocr-fallback"
                else:
                    method = "empty"
            seen_page_texts.append(txt)
            if lang == "en" and _is_hindi_page(txt):
                skipped_lang_pages += 1
                continue
            cleaned = clean_extracted_text(txt, doc_type=doc_type)
            raw_pages.append({"page": idx, "text": cleaned, "method": method})
            if method not in methods_used:
                methods_used.append(method)

    digital_pages = sum(1 for p in raw_pages if p["method"] in ("pymupdf", "pypdf") and p["text"])
    ocr_pages = sum(1 for p in raw_pages if p["method"].startswith("ocr") and p["text"])
    empty_pages = sum(1 for p in raw_pages if not p["text"])
    total_chars = sum(len(p["text"]) for p in raw_pages)

    if empty_pages:
        warnings.append(f"{empty_pages}/{page_count} page(s) had no extractable text")
    if "ocr-fallback" in methods_used:
        warnings.append("used pre-extracted OCR fallback for image-only scan pages; verify formulas")
    if "ocr-rapidocr" in methods_used:
        warnings.append("used RapidOCR; verify spacing and chemical subscripts against source PDF")

    chunks = chunk_pages(
        raw_pages,
        source=source_name,
        doc_type=doc_type,
        chapter=ch_num,
        chapter_title=ch_title,
    )
    report = FileReport(
        source=source_name,
        sha256=file_hash,
        doc_type=doc_type,
        chapter=ch_num,
        chapter_title=ch_title,
        pages=page_count,
        digital_pages=digital_pages,
        ocr_pages=ocr_pages,
        empty_pages=empty_pages,
        chars=total_chars,
        chunks=len(chunks),
        extraction_methods=methods_used,
        warnings=warnings,
        skipped_lang_pages=skipped_lang_pages,
    )
    return chunks, report


def report_to_dict(report: FileReport) -> dict[str, Any]:
    return asdict(report)
