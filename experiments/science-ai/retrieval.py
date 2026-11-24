"""Formula-aware BM25 and optional hybrid embedding retrieval for Class 10 Science."""
from __future__ import annotations

import json
import math
import re
import urllib.error
import urllib.request
from collections import Counter
from typing import Any

_SUBSCRIPTS = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")

_STOPWORDS = frozenset(
    {
        "a", "about", "all", "an", "and", "are", "as", "at", "be", "between", "by", "can", "class",
        "define", "describe", "did", "do", "does", "explain", "for", "from", "give",
        "has", "have", "how", "in", "into", "is", "it", "its", "me", "name", "of", "on",
        "or", "should", "state", "tell", "that", "the", "their", "them", "these", "they",
        "this", "to", "using", "was", "were", "what", "when", "where", "which", "who", "why",
        "will", "with", "would", "write", "you", "your",
    }
)

_SYNONYMS = {
    "neutralisation": "neutralization",
    "neutralise": "neutralize",
    "neutralised": "neutralize",
    "oxidised": "oxidize",
    "oxidized": "oxidize",
    "oxidising": "oxidize",
    "oxidizing": "oxidize",
    "colour": "color",
    "coloured": "color",
    "vapour": "vapor",
    "sulphur": "sulfur",
    "sulphuric": "sulfuric",
    "sulphate": "sulfate",
    "aluminium": "aluminum",
    "haemoglobin": "hemoglobin",
    "oesophagus": "esophagus",
    "metre": "meter",
    "centre": "center",
    "ionisation": "ionization",
    "homologous": "homolog",
    "photosynthetic": "photosynthesis",
    "refracted": "refract",
    "refracting": "refract",
    "refraction": "refract",
    "reflected": "reflect",
    "reflecting": "reflect",
    "reflection": "reflect",
    "magnified": "magnify",
    "magnification": "magnify",
    "magnesium": "magnesium",
    "electromagnetic": "electromagnet",
    "electromagnetism": "electromagnet",
    "resistivity": "resist",
    "resistance": "resist",
    "resistors": "resist",
    "resistor": "resist",
    "circuits": "circuit",
    "mirrors": "mirror",
    "lenses": "lens",
    "acids": "acid",
    "bases": "base",
    "salts": "salt",
    "metals": "metal",
    "nonmetals": "nonmetal",
    "equations": "equation",
    "reactions": "reaction",
    "reactants": "reactant",
    "products": "product",
    "organisms": "organism",
    "enzymes": "enzyme",
    "hormones": "hormone",
    "chromosomes": "chromosome",
    "traits": "trait",
    "genes": "gene",
    "magnetic": "magnet",
}

_FORMULA_RE = re.compile(r"\b(?:[A-Z][a-z]?\d*|\([A-Za-z0-9]+\)\d*){2,}\b|\bpH\b")


def _normalize_word(word: str) -> str:
    w = word.lower()
    if w in _SYNONYMS:
        return _SYNONYMS[w]
    if len(w) > 4 and w.endswith("ies"):
        w = w[:-3] + "y"
    elif len(w) > 4 and w.endswith("es") and not w.endswith(("ses", "oes")):
        w = w[:-2]
    elif len(w) > 4 and w.endswith("s") and not w.endswith(("ss", "us", "is")):
        w = w[:-1]
    elif len(w) > 5 and w.endswith("ing"):
        w = w[:-3]
    elif len(w) > 5 and w.endswith("ed"):
        w = w[:-2]
    return _SYNONYMS.get(w, w)


def extract_formulas(text: str) -> list[str]:
    norm = text.translate(_SUBSCRIPTS)
    found: list[str] = []
    for m in _FORMULA_RE.finditer(norm):
        tok = re.sub(r"[^a-z0-9]", "", m.group(0).lower())
        if len(tok) >= 2 and not tok.isdigit():
            found.append(tok)
    return found


def tokenize(text: str, *, keep_stopwords: bool = False) -> list[str]:
    """Tokenize Science prose and chemical formulas without letting bare digits dominate."""
    norm = (
        text.translate(_SUBSCRIPTS)
        .replace("non-metal", "nonmetal")
        .replace("Non-metal", "nonmetal")
        .replace("quicklime", "quick lime")
        .replace("Quicklime", "quick lime")
        .replace("limewater", "lime water")
        .replace("Limewater", "lime water")
        .replace("hydrogencarbonate", "hydrogen carbonate")
        .replace("Hydrogencarbonate", "hydrogen carbonate")
    )
    raw_words = re.findall(r"[A-Za-z0-9]+", norm)
    tokens: list[str] = []
    for raw in raw_words:
        low = raw.lower()
        # Drop pure small numbers (page numbers, list indices) unless they carry units/formulas.
        if low.isdigit():
            continue
        if len(low) == 1 and low not in ("i", "v", "r", "f", "p", "q", "x", "y"):
            continue
        if not keep_stopwords and low in _STOPWORDS:
            continue
        tokens.append(_normalize_word(low))
    # Preserve whole chemical formula tokens like "caoh2", "h2so4", "na2co3".
    for f in extract_formulas(text):
        tokens.append(f"chem:{f}")
    return tokens


def bigrams(tokens: list[str]) -> set[str]:
    clean = [t for t in tokens if not t.startswith("chem:")]
    return {f"{clean[i]} {clean[i + 1]}" for i in range(len(clean) - 1)}


def _ollama_embed(text: str, embed_model: str, base_url: str = "http://127.0.0.1:11434") -> list[float] | None:
    payload = json.dumps({"model": embed_model, "prompt": text}).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url.rstrip('/')}/api/embeddings",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.load(resp)
        vec = data.get("embedding")
        return [float(x) for x in vec] if isinstance(vec, list) and vec else None
    except (OSError, ValueError, urllib.error.URLError):
        return None


def _cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0.0 or nb == 0.0:
        return 0.0
    return dot / (na * nb)


class Retriever:
    """In-memory Okapi BM25 + formula/section/bigram scorer over indexed chunks."""

    def __init__(self, chunks: list[dict[str, Any]], k1: float = 1.5, b: float = 0.75):
        self.chunks = chunks
        self.k1 = k1
        self.b = b
        self.doc_tf: list[Counter[str]] = []
        self.doc_len: list[int] = []
        self.doc_bigrams: list[set[str]] = []
        self.section_tokens: list[set[str]] = []
        self.df: Counter[str] = Counter()

        for c in chunks:
            toks = tokenize(c.get("text", ""))
            tf = Counter(toks)
            self.doc_tf.append(tf)
            self.doc_len.append(len(toks))
            self.doc_bigrams.append(bigrams(toks))
            sec_text = f"{c.get('chapter_title') or ''} {c.get('section') or ''}"
            self.section_tokens.append(set(tokenize(sec_text)))
            for term in tf:
                self.df[term] += 1

        self.n_docs = len(chunks)
        self.avg_dl = (sum(self.doc_len) / self.n_docs) if self.n_docs else 1.0

    def search(
        self,
        question: str,
        *,
        limit: int = 4,
        chapter: int | None = None,
        doc_type: str | None = None,
        embed_model: str | None = None,
        diversify: bool = True,
        min_confidence: bool = True,
    ) -> list[dict[str, Any]]:
        q_tokens = tokenize(question)
        if not q_tokens or not self.chunks:
            return []
        q_counts = Counter(q_tokens)
        q_unique = set(q_counts)
        q_bigrams = bigrams(q_tokens)
        q_formulas = {t for t in q_tokens if t.startswith("chem:")}

        candidates: list[tuple[float, int, set[str]]] = []
        for idx, chunk in enumerate(self.chunks):
            if chapter is not None and chunk.get("chapter") != chapter:
                continue
            if doc_type and doc_type != "all" and chunk.get("doc_type") != doc_type:
                continue

            tf = self.doc_tf[idx]
            dl = max(1, self.doc_len[idx])
            bm25 = 0.0
            matched_set: set[str] = set()
            for term, qf in q_counts.items():
                freq = tf.get(term, 0)
                if not freq:
                    continue
                matched_set.add(term)
                df = self.df[term]
                idf = math.log(1.0 + (self.n_docs - df + 0.5) / (df + 0.5))
                denom = freq + self.k1 * (1.0 - self.b + self.b * (dl / self.avg_dl))
                bm25 += idf * ((freq * (self.k1 + 1.0)) / denom) * (1.0 + 0.15 * (qf - 1))

            if bm25 <= 0.0:
                continue

            # Boost exact phrase bigrams, chemical formulas, and section/title matches.
            bg_hits = len(q_bigrams & self.doc_bigrams[idx]) if q_bigrams else 0
            sec_hits = len(q_unique & self.section_tokens[idx])
            chem_hits = len(q_formulas & set(tf)) if q_formulas else 0
            coverage = len(matched_set) / max(1, len(q_unique))

            score = bm25 * (1.0 + 0.2 * coverage) + 1.4 * bg_hits + 1.6 * sec_hits + 2.2 * chem_hits
            # Tiny nudge for clean digital extraction over noisy OCR on exact ties.
            if not str(chunk.get("extraction_method", "")).startswith("ocr"):
                score *= 1.03
            candidates.append((score, idx, matched_set))

        if not candidates:
            return []

        candidates.sort(key=lambda item: item[0], reverse=True)

        if min_confidence:
            top_score, _, top_matched = candidates[0]
            non_chem_q = [t for t in q_unique if not t.startswith("chem:")]
            top_cov = len(top_matched) / max(1, len(q_unique))
            if len(non_chem_q) >= 3 and len(top_matched) < 2:
                return []
            if len(non_chem_q) >= 4 and top_cov < 0.35 and top_score < 14.0:
                return []
            if top_score < 6.0:
                return []

        # Optional hybrid RRF reranking via local Ollama embeddings on top-24 BM25 hits.
        if embed_model:
            q_vec = _ollama_embed(question, embed_model)
            if q_vec:
                top_pool = candidates[:24]
                matched_by_idx = {idx: m for _, idx, m in top_pool}
                vec_scores: list[tuple[float, int]] = []
                for _, idx, _ in top_pool:
                    c_vec = self.chunks[idx].get("embedding")
                    if not c_vec:
                        c_vec = _ollama_embed(self.chunks[idx].get("text", "")[:1200], embed_model)
                    if c_vec:
                        vec_scores.append((_cosine(q_vec, c_vec), idx))
                if vec_scores:
                    bm25_rank = {idx: r for r, (_, idx, _) in enumerate(top_pool, 1)}
                    vec_scores.sort(key=lambda x: x[0], reverse=True)
                    vec_rank = {idx: r for r, (_, idx) in enumerate(vec_scores, 1)}
                    reranked = []
                    for _, idx, _ in top_pool:
                        rrf = 1.0 / (20 + bm25_rank[idx]) + 1.0 / (20 + vec_rank.get(idx, 50))
                        reranked.append((rrf, idx, matched_by_idx[idx]))
                    reranked.sort(key=lambda x: x[0], reverse=True)
                    candidates = reranked + candidates[24:]

        # Greedy selection balancing BM25 relevance, subtopic coverage, and low overlap.
        selected: list[dict[str, Any]] = []
        selected_sets: list[set[str]] = []
        covered_q_terms: set[str] = set()
        remaining = list(candidates[:60])

        while remaining and len(selected) < limit:
            best_pos = 0
            best_adj = -1.0
            for pos, (score, idx, mset) in enumerate(remaining):
                tok_set = set(self.doc_tf[idx])
                max_overlap = 0.0
                if diversify and tok_set and selected_sets:
                    for prev_set in selected_sets:
                        union = len(tok_set | prev_set)
                        if union:
                            max_overlap = max(max_overlap, len(tok_set & prev_set) / union)
                if max_overlap > 0.65:
                    adj = score * 0.25
                else:
                    uncovered_bonus = 1.0 + 0.35 * (len(mset - covered_q_terms) / max(1, len(q_unique)))
                    adj = score * uncovered_bonus * (1.0 - 0.35 * max_overlap)
                if adj > best_adj:
                    best_adj = adj
                    best_pos = pos

            score, idx, mset = remaining.pop(best_pos)
            item = dict(self.chunks[idx])
            item["score"] = round(score, 4)
            selected.append(item)
            selected_sets.append(set(self.doc_tf[idx]))
            covered_q_terms.update(mset)

        return selected
