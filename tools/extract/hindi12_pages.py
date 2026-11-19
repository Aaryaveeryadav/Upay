"""Extract faithful reading pages; avoid interpreting legacy-font bytes as Hindi.
Usage: python tools/extract/hindi12_pages.py SOURCE_DIR (PyMuPDF, Pillow).
"""
from pathlib import Path
import sys
import pymupdf
from PIL import Image

for stem in [f'{book}{100+n}' for book, size in [('lhar',15),('lhat',17),('lhvt',3),('lhan',3)] for n in range(1,size+1)] + ['lhvt1lp']:
    dest = Path('assets/hindi/class12') / stem
    dest.mkdir(parents=True, exist_ok=True)
    with pymupdf.open(Path(sys.argv[1]) / (stem+'.pdf')) as doc:
        for page in doc:
            pix = page.get_pixmap(dpi=150, alpha=False)
            Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(dest / f'{page.number+1}.webp', quality=85, method=3)
