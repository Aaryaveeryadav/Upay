#!/usr/bin/env python3
"""Extract numbered NCERT figure crops from a supplied chapter PDF.

Figure art in the NCERT reprints lives both in page drawings and in Form
XObjects; text glyph art is invisible to get_drawings(). This locates each
"Fig N.M" caption line (captions may wrap onto following lines), clusters the
page's drawing/image rectangles, assigns the nearest cluster to the caption,
and renders a tight crop (200 dpi) for review. Figures rendered purely as
glyph art (e.g. reaction schemes) yield "no matching graphic cluster" and are
cropped manually. Visual verification of every output is required.

Usage: python3 tools/extract/extract-chemistry-figures.py <pdf-dir> <out-dir>
Prints a JSON report: figure, page, crop_points, caption, cluster size.
"""
import fitz, hashlib, json, math, re, sys
from pathlib import Path

CAPTION_RE = re.compile(r'^Fig(?:ure)?\.?\s*(\d+)\.(\d+)\b\s*[:.]?\s*(.*)')
CAP_CLEAN = re.compile(r'^Fig(?:ure)?\.?\s*\d+\.\d+\s*[:.]?\s*')
CAPTION_CLEAN_RE = CAP_CLEAN
MAX_RECT_AREA = 45000.0     # page-size mask frames / clip paths are not figure art
MIN_CLUSTER_AREA = 100.0
EXPAND = 6.0
MATCH_DIST = 150.0


def _norm(line):
    return ' '.join(''.join(s.get('text', '') for s in line['spans']).split())


def page_captions(page, seen):
    raw = []
    for b in page.get_text('dict')['blocks']:
        if b.get('type') != 0:
            continue
        lines = b['lines']
        for i, line in enumerate(lines):
            t = _norm(line)
            m = CAPTION_RE.match(t)
            if not m:
                continue
            fig = f'{m.group(1)}.{m.group(2)}'
            caption = t
            j = i + 1
            while j < len(lines) and len(caption) < 170:
                nxt = _norm(lines[j])
                if not nxt or CAPTION_RE.match(nxt):
                    break
                caption = f'{caption} {nxt}'
                j += 1
            raw.append({'fig': fig, 'rect': fitz.Rect(line['bbox']),
                        'caption': CAPTION_CLEAN_RE.sub('', caption).strip()})
    # dedupe (number-only typeset line vs the line carrying the text); keep first rect
    caps = {}
    for c in raw:
        prev = caps.get(c['fig'])
        if prev is None:
            if c['fig'] in seen:  # document-wide dedupe: first occurrence wins
                continue
            caps[c['fig']] = c
        elif len(c['caption']) > len(prev['caption']):
            caps[c['fig']] = {**c, 'rect': prev['rect']}
    for fig in caps:
        seen.add(fig)
    return list(caps.values())


def is_black_mask(doc, xref, w, h):
    """The two DeviceGray pure-black page/frame masks, identified by geometry + content."""
    if (w, h) not in ((2480, 3508), (1894, 1894)):
        return False
    pix = fitz.Pixmap(doc, xref)
    return max(pix.samples) == 0


def page_clusters(page, doc):
    rects = []
    for d in page.get_drawings():
        r = fitz.Rect(d['rect'])
        if r.is_empty or r.get_area() > MAX_RECT_AREA or not r.intersects(page.rect):
            continue
        rects.append(r)
    for img in page.get_images(full=True):
        xref, w, h = img[0], img[2], img[3]
        if is_black_mask(doc, xref, w, h):
            continue
        for r in page.get_image_rects(xref):
            if r.is_empty or not r.intersects(page.rect):
                continue
            rects.append(fitz.Rect(r))
    n = len(rects)
    if not n:
        return []
    ex = [fitz.Rect(r.x0 - EXPAND, r.y0 - EXPAND, r.x1 + EXPAND, r.y1 + EXPAND) for r in rects]
    parent = list(range(n))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    order = sorted(range(n), key=lambda i: ex[i].x0)
    for oi, i in enumerate(order):
        for j in order[oi + 1:]:
            if ex[j].x0 > ex[i].x1:
                break
            if ex[i].intersects(ex[j]):
                ri, rj = find(i), find(j)
                if ri != rj:
                    parent[ri] = rj
    groups = {}
    for i in range(n):
        groups.setdefault(find(i), []).append(i)
    out = []
    for idxs in groups.values():
        r = fitz.Rect(ex[idxs[0]])
        for i in idxs[1:]:
            r |= ex[i]
        r = fitz.Rect(r.x0 + EXPAND, r.y0 + EXPAND, r.x1 - EXPAND, r.y1 - EXPAND)
        if abs(r) >= MIN_CLUSTER_AREA and r.width > 8 and r.height > 8 and r.intersects(page.rect):
            out.append(r)
    return out


ASSIGN_Y_OVERLAP = 0.25     # absorb same-band artwork clusters (multi-panel figures)
ASSIGN_X_GAP = 60.0         # horizontal gap tolerated when absorbing a same-band cluster


def absorb_band(seed_idx, clus):
    chosen = {seed_idx}
    frontier = [seed_idx]
    steps = 0
    while frontier and steps < 12:
        steps += 1
        cur = frontier.pop()
        cur_r = clus[cur]
        for j, cl in enumerate(clus):
            if j in chosen:
                continue
            ov_y = min(cur_r.y1, cl.y1) - max(cur_r.y0, cl.y0)
            if ov_y < ASSIGN_Y_OVERLAP * min(cur_r.height, cl.height):
                continue
            gap_x = max(0.0, max(cur_r.x0 - cl.x1, cl.x0 - cur_r.x1))
            if gap_x > ASSIGN_X_GAP:
                continue
            chosen.add(j)
            frontier.append(j)
    r = fitz.Rect(clus[seed_idx])
    for j in chosen:
        if j != seed_idx:
            r |= clus[j]
    return r


def bbox_dist(a, b):
    dx = max(0.0, max(a.x0 - b.x1, b.x0 - a.x1))
    dy = max(0.0, max(a.y0 - b.y1, b.y0 - a.y1))
    return math.hypot(dx, dy)


# Figures whose automatic extraction cannot be trusted (interleaved layouts,
# caption-clamp misfires); rects measured on the source pages and visually
# verified at 200 dpi.
MANUAL_CROPS = {
    '1.7': (26, 54, 245, 240),
    '1.11': (30, 235, 270, 369),
    '2.4': (150, 440, 520, 582),
    '2.7': (187, 418, 450, 653),
    '3.6': (348, 146.5, 512, 205),
    '3.11': (56, 395, 286, 516.5),
    '4.1': (76, 456, 270, 673),
    '4.2': (183, 212, 513, 466),
    '4.3': (70, 126, 280, 303),
    '5.5': (170, 186, 352, 295),
    '5.3': (40, 570, 275, 673),
    '5.6': (50, 422, 335, 553),
    '5.7': (136, 585, 408, 703.5),
    '5.9': (40, 82, 286, 223),
    '5.10': (52, 48, 362, 188),
    '5.11': (190, 385, 545, 571),
    '5.12': (255, 62, 510, 141),
    '5.13': (175, 62, 525, 248),
    '5.14': (55, 272, 282, 356),
    '6.2': (116, 528, 522, 586),
    '6.3': (46, 94, 520, 248),
    '6.5': (218, 483, 520, 608),
    '6.6': (190, 30, 520, 179),
    '7.1': (55, 592, 545, 680),
    '8.1': (105, 172, 522, 249),
    '9.1': (60, 96, 500, 297),
    '9.2': (200, 110, 425, 215),
    '10.2': (60, 462, 240, 610),
    '10.3': (60, 118, 545, 306),
    '10.4': (158, 355, 530, 606),
    '10.5': (172, 458, 530, 572),
    '10.6': (55, 58, 500, 300),
}
MANUAL_MULTI = {
    '10.1': [
        ('10.1a', (40, 127, 120, 402),
         'alpha-Helix structure of proteins (Fig. 10.1, part 1): rod and hand screwed into a right-handed helix with ribbon strands.'),
        ('10.1b', (145, 176, 226, 397),
         'alpha-Helix structure of proteins (Fig. 10.1, part 2): hydrogen-bonded helical ladder between N-H and C=O groups of the peptide backbone.'),
    ],
    '8.2': [
        ('8.2a', (55, 200, 175, 338),
         'Nucleophilic attack on carbonyl carbon (Fig. 8.2, part 1): the nucleophile attacks the planar, sp2-hybridised carbonyl carbon from a direction perpendicular to its plane; step 1 is slow.'),
        ('8.2b', (55, 344, 385, 424.5),
         'Nucleophilic attack on carbonyl carbon (Fig. 8.2, part 2): the tetrahedral alkoxide intermediate captures H+ (step 2, fast) to give the addition product.'),
    ],
    '2.2': [
        ('2.2a', (55, 366, 245, 522),
         'Sub-figure (a): Eext < 1.1 V — electrons flow from the Zn rod to the Cu rod; Zn dissolves at the anode and copper deposits at the cathode.'),
        ('2.2b', (278, 366, 439.5, 522),
         'Sub-figure (b): Eext = 1.1 V — no flow of electrons or current; no chemical reaction.'),
        ('2.2c', (270, 524, 423, 666),
         'Sub-figure (c): Eext > 1.1 V — electrons flow from Cu to Zn; zinc deposits at the zinc electrode and copper dissolves at the copper electrode.'),
    ],
}


def main():
    src_dir, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    report = []
    for pdf in sorted(src_dir.glob('*.pdf')):
        doc = fitz.open(pdf)
        src_sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
        seen_figs = set()
        for pno, page in enumerate(doc, 1):
            caps = page_captions(page, seen_figs)
            if not caps:
                continue
            clus = page_clusters(page, doc)
            used = set()
            pairs = []
            for ci, cap in enumerate(caps):
                for ki, cl in enumerate(clus):
                    pairs.append((bbox_dist(cap['rect'], cl), ci, ki))
            pairs.sort(key=lambda t: t[0])
            assign = {}
            for dist, ci, ki in pairs:
                if ci in assign or ki in used:
                    continue
                if dist > MATCH_DIST:
                    continue
                assign[ci] = ki
                used.add(ki)
            for ci, cap in enumerate(caps):
                if cap['fig'] in MANUAL_MULTI:
                    for fig_id, rect, caption in MANUAL_MULTI[cap['fig']]:
                        clip = fitz.Rect(*rect) & page.rect
                        entry = {'source_file': pdf.name, 'source_sha256': src_sha, 'pdf_page': pno,
                                 'figure': fig_id, 'caption': caption,
                                 'crop_points': [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)],
                                 'edit': 'manual crop (visual verification)'}
                        out = out_dir / f'{pdf.stem}_fig{fig_id}.png'
                        page.get_pixmap(dpi=200, clip=clip).save(out)
                        entry['file'] = str(out)
                        report.append(entry)
                    continue
                entry = {'source_file': pdf.name, 'source_sha256': src_sha, 'pdf_page': pno,
                         'figure': cap['fig'], 'caption': cap['caption'][:180]}
                if cap['fig'] in MANUAL_CROPS:
                    clip = fitz.Rect(*MANUAL_CROPS[cap['fig']]) & page.rect
                    entry['crop_points'] = [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)]
                    entry['edit'] = 'manual crop (visual verification)'
                    out = out_dir / f'{pdf.stem}_fig{cap["fig"]}.png'
                    page.get_pixmap(dpi=200, clip=clip).save(out)
                    entry['file'] = str(out)
                    report.append(entry)
                    continue
                ki = assign.get(ci)
                if ki is None:
                    entry['error'] = 'no matching graphic cluster found'
                    report.append(entry)
                    continue
                r = absorb_band(ki, clus)
                clip = fitz.Rect(r.x0 - 8.0, r.y0 - 8.0, r.x1 + 8.0, r.y1 + 8.0)
                # union exposed text lines that substantially overlap the figure
                # zone (figure-internal labels are drawn as text but set inside
                # the figure area); caption lines are explicitly excluded
                zone = fitz.Rect(r.x0 - 2.0, r.y0 - 2.0, r.x1 + 2.0, r.y1 + 2.0)
                cap_rect = cap['rect']
                text_extra = fitz.Rect()
                for b in page.get_text('dict')['blocks']:
                    if b.get('type') != 0:
                        continue
                    for line in b['lines']:
                        t = fitz.Rect(line['bbox'])
                        ix = t & zone
                        if ix.is_empty or ix.width < 0.35 * t.width:
                            continue
                        if t.intersects(cap_rect) and abs(t.y0 - cap_rect.y0) < 2.0:
                            continue
                        text_extra |= t
                if not text_extra.is_empty:
                    clip |= text_extra
                clip &= page.rect
                # never let crop swallow the caption line (captions set below/above figure)
                cap_rect = cap['rect']
                if cap_rect.y0 >= clip.y0 and cap_rect.y0 < clip.y1 and not (cap_rect.x1 < clip.x0 or cap_rect.x0 > clip.x1):
                    clip = fitz.Rect(clip.x0, clip.y0, clip.x1, cap_rect.y0 - 2)
                if cap_rect.y1 <= clip.y1 and cap_rect.y1 > clip.y0 and not (cap_rect.x1 < clip.x0 or cap_rect.x0 > clip.x1):
                    clip = fitz.Rect(clip.x0, cap_rect.y1 + 2, clip.x1, clip.y1)
                entry['crop_points'] = [round(v, 1) for v in (clip.x0, clip.y0, clip.x1, clip.y1)]
                entry['cluster_points'] = [round(v, 1) for v in (r.x0, r.y0, r.x1, r.y1)]
                pix = page.get_pixmap(dpi=200, clip=clip)
                out = out_dir / f'{pdf.stem}_fig{cap["fig"]}.png'
                pix.save(out)
                entry['file'] = str(out)
                report.append(entry)
        doc.close()
    print(json.dumps(report, indent=1))


if __name__ == '__main__':
    main()
