#!/usr/bin/env python3
"""Re-render the four selected figure crops; compare them with the manifest.

Requires pymupdf and Pillow. Checks PDF identity and crop output, not whether
all relevant figures in the batch have been found. PDF coordinates are points.
"""
import argparse, hashlib, io, json
from pathlib import Path
import pymupdf
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(); parser.add_argument('pdf_dir',type=Path); args=parser.parse_args()
manifest=json.loads((root/'assets/img/notes/manifest.json').read_text())
for item in manifest['images']:
    pdf=args.pdf_dir/item['source_file']
    assert hashlib.sha256(pdf.read_bytes()).hexdigest()==item['source_sha256']
    doc=pymupdf.open(pdf); page=doc[item['pdf_page']-1]
    pix=page.get_pixmap(matrix=pymupdf.Matrix(2,2),clip=pymupdf.Rect(item['crop_points']),alpha=False)
    image=Image.open(io.BytesIO(pix.tobytes('png'))).convert('RGB')
    if item['edit'] != 'none':
        assert item['edit']=='Unrelated partial equation masked in white'
        ImageDraw.Draw(image).rectangle((250,0,470,29),fill='white')
    out=io.BytesIO(); image.save(out,format='PNG',optimize=True)
    assert hashlib.sha256(out.getvalue()).hexdigest()==item['sha256'], item['path']
print('PASS: source hashes and four selected crop bytes match manifest')
