"""Unit and integration tests for experiments/science-ai prototypes."""
from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from pdf_extract import clean_extracted_text, detect_chapter_info, chunk_pages  # noqa: E402
from retrieval import Retriever, tokenize  # noqa: E402
from tiny_model import ByteBPETokenizer  # noqa: E402
import tutor  # noqa: E402


class PdfCleanAndDetectTests(unittest.TestCase):
    def test_detect_chapter_handles_underscore_and_hyphen(self):
        ch, title, dt = detect_chapter_info("ncert_class_10_science_chapter_4_compressed.pdf")
        self.assertEqual((ch, dt), (4, "textbook"))
        self.assertIn("Carbon", title or "")

        ch8, _, dt8 = detect_chapter_info("ncert_class_10_science_chapter_8_compressed.pdf")
        self.assertEqual((ch8, dt8), (8, "textbook"))

        _, _, dt_pyq = detect_chapter_info("31_1_1_Science_2025.pdf")
        self.assertEqual(dt_pyq, "pyq")

    def test_clean_extracted_text_fixes_dropcaps_formulas_and_headers(self):
        raw = (
            "Acids, Bases and Salts 21\n"
            "2024-25\n"
            "Y\n\nou have learnt that CaCO 3( s) + H 2O(l) + CO 2(g) → Ca(HCO3)2 (aq).\n"
            "n Add dilute acid.\n"
            "Q\nU\nE\nS\nT\nI\nO\nN\nS\n?\n"
        )
        cleaned = clean_extracted_text(raw, doc_type="textbook")
        self.assertNotIn("2024-25", cleaned)
        self.assertNotIn("Acids, Bases and Salts 21", cleaned)
        self.assertIn("You have learnt", cleaned)
        self.assertIn("CaCO3(s)", cleaned)
        self.assertIn("H2O(l)", cleaned)
        self.assertIn("CO2(g)", cleaned)
        self.assertIn("- Add dilute acid.", cleaned)
        self.assertIn("QUESTIONS", cleaned)

    def test_chunk_pages_tracks_sections_and_pages(self):
        pages = [
            {
                "page": 3,
                "method": "pymupdf",
                "text": "1.1 Chemical Equations\n\nMagnesium burns in air to form magnesium oxide.",
            }
        ]
        chunks = chunk_pages(
            pages,
            source="ch1.pdf",
            doc_type="textbook",
            chapter=1,
            chapter_title="Chemical Reactions and Equations",
        )
        self.assertEqual(len(chunks), 1)
        self.assertEqual(chunks[0]["page"], 3)
        self.assertEqual(chunks[0]["section"], "1.1 Chemical Equations")


class RetrievalTests(unittest.TestCase):
    def setUp(self):
        self.chunks = [
            {
                "id": "ch1#1",
                "source": "ch1.pdf",
                "page": 6,
                "doc_type": "textbook",
                "chapter": 1,
                "chapter_title": "Chemical Reactions and Equations",
                "section": "1.2.1 Combination Reaction",
                "extraction_method": "pymupdf",
                "text": "Calcium oxide or quick lime reacts vigorously with water to produce slaked lime Ca(OH)2 releasing heat.",
            },
            {
                "id": "ch2#1",
                "source": "ch2.pdf",
                "page": 14,
                "doc_type": "textbook",
                "chapter": 2,
                "chapter_title": "Acids, Bases and Salts",
                "section": "2.4.4 Plaster of Paris",
                "extraction_method": "pymupdf",
                "text": "On heating gypsum at 373 K, it loses water molecules and becomes calcium sulphate hemihydrate called Plaster of Paris.",
            },
            {
                "id": "ch10#1",
                "source": "ch10.pdf",
                "page": 9,
                "doc_type": "textbook",
                "chapter": 10,
                "chapter_title": "The Human Eye and the Colourful World",
                "section": "10.6.2 Why is the colour of the clear Sky Blue?",
                "extraction_method": "pymupdf",
                "text": "Fine particles scatter blue light. Scattering of light causes the sky to appear blue; without atmosphere it appears dark.",
            },
        ]
        self.ret = Retriever(self.chunks)

    def test_quicklime_matches_quick_lime(self):
        hits = self.ret.search("What happens when quicklime reacts with water?", limit=2)
        self.assertTrue(hits)
        self.assertEqual(hits[0]["chapter"], 1)

    def test_formula_tokens_ignore_bare_digits(self):
        toks = tokenize("Balance H₂SO₄ and Ca(OH)₂ on page 2")
        self.assertIn("chem:h2so4", toks)
        self.assertIn("chem:caoh2", toks)
        self.assertNotIn("2", toks)

    def test_out_of_scope_query_abstains(self):
        hits = self.ret.search("Evaluate the integral of sin(x^2) using integration by parts.", limit=3)
        self.assertEqual(hits, [])


class TutorPipelineTests(unittest.TestCase):
    def test_ask_with_mocked_ollama_uses_chat_and_cites(self):
        chunks = [
            {
                "id": "c1",
                "source": "ch2.pdf",
                "page": 11,
                "doc_type": "textbook",
                "chapter": 2,
                "section": "pH of tooth decay",
                "extraction_method": "pymupdf",
                "text": "Tooth decay starts when the pH of the mouth is lower than 5.5.",
            }
        ]
        fake_resp = mock.MagicMock()
        fake_resp.read.return_value = json.dumps(
            {"message": {"content": "Tooth decay begins below pH 5.5 [1]."}}
        ).encode("utf-8")
        fake_resp.__enter__.return_value = fake_resp
        fake_resp.__exit__.return_value = False

        with mock.patch("urllib.request.urlopen", return_value=fake_resp) as m_open:
            ans = tutor.ask(chunks, "At what pH does tooth decay start?", model="qwen2.5:3b")
            self.assertIn("pH 5.5 [1]", ans)
            self.assertIn("ch2.pdf", ans)
            req = m_open.call_args[0][0]
            self.assertTrue(req.full_url.endswith("/api/chat"))
            sent = json.loads(req.data.decode("utf-8"))
            self.assertEqual(sent["options"]["num_ctx"], 4096)

    def test_export_corpus_deduplicates(self):
        with tempfile.TemporaryDirectory() as tmp:
            idx_path = Path(tmp) / "idx.json"
            out_path = Path(tmp) / "corpus.txt"
            chunks = [
                {"source": "a.pdf", "page": 1, "doc_type": "textbook", "chapter_title": "Ch 1", "section": "Intro", "text": "Magnesium burns in air with a dazzling white flame."},
                {"source": "a.pdf", "page": 1, "doc_type": "textbook", "chapter_title": "Ch 1", "section": "Intro", "text": "Magnesium burns in air with a dazzling white flame."},
            ]
            tutor.save_index(idx_path, {"a.pdf": {"chunks": 2}}, chunks)
            tutor.export_corpus(idx_path, out_path)
            content = out_path.read_text(encoding="utf-8")
            self.assertEqual(content.count("Magnesium burns in air"), 1)


class TokenizerTests(unittest.TestCase):
    def test_bpe_roundtrip(self):
        raw = b"Magnesium reacts with oxygen to form magnesium oxide. Magnesium oxide is basic."
        tok = ByteBPETokenizer.train(raw, vocab_size=280)
        self.assertGreater(tok.vocab_size, 256)
        ids = tok.encode(raw)
        self.assertLess(len(ids), len(raw))
        self.assertEqual(tok.decode(ids), raw.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
