#!/usr/bin/env python3
"""Check Class 12 English PDF identity and metadata, not a complete syllabus audit.

Run: python3 tools/check/english12_sources.py --uploads /home/user/uploads
Verifies all 40 files, their title/author text, counts, SHA-256, section notes,
bilingual review structure, and multi-work selections. Does not
certify the reading prompts, literary interpretations, or official answer keys.
"""
from pathlib import Path
import argparse
import hashlib
import json
import re
import unicodedata
import pymupdf

ROOT = Path(__file__).resolve().parents[2]
# Independent mapping reviewed against the supplied PDFs; filename, title,
# author, book, section, section number, chapter ID.
EXPECTED = [
 ('lefl101.pdf','The Last Lesson','Alphonse Daudet','flamingo','prose',1,1501),
 ('lefl102.pdf','Lost Spring','Anees Jung','flamingo','prose',2,1502),
 ('lefl103.pdf','Deep Water','William Douglas','flamingo','prose',3,1503),
 ('lefl104.pdf','The Rattrap','Selma Lagerlöf','flamingo','prose',4,1504),
 ('lefl105.pdf','Indigo','Louis Fischer','flamingo','prose',5,1505),
 ('lefl106.pdf','Poets and Pancakes','Asokamitran','flamingo','prose',6,1506),
 ('lefl107.pdf','The Interview','Christopher Silvester','flamingo','prose',7,1507),
 ('lefl108.pdf','Going Places','A. R. Barton','flamingo','prose',8,1508),
 ('lefl111.pdf','My Mother at Sixty-six','Kamala Das','flamingo','poetry',1,1511),
 ('lefl112.pdf','Keeping Quiet','Pablo Neruda','flamingo','poetry',2,1512),
 ('lefl113.pdf','A Thing of Beauty','John Keats','flamingo','poetry',3,1513),
 ('lefl114.pdf','A Roadside Stand','Robert Frost','flamingo','poetry',4,1514),
 ('lefl115.pdf','Aunt Jennifer’s Tigers','Adrienne Rich','flamingo','poetry',5,1515),
 ('lekl101.pdf','I Sell My Dreams','Gabriel García Márquez','kaleidoscope','short-stories',1,1601),
 ('lekl102.pdf','Eveline','James Joyce','kaleidoscope','short-stories',2,1602),
 ('lekl103.pdf','A Wedding in Brownsville','Isaac Bashevis Singer','kaleidoscope','short-stories',3,1603),
 ('lekl104.pdf','Tomorrow','Joseph Conrad','kaleidoscope','short-stories',4,1604),
 ('lekl105.pdf','One Centimetre','Bi Shu-min','kaleidoscope','short-stories',5,1605),
 ('lekl111.pdf','A Lecture Upon the Shadow','John Donne','kaleidoscope','poetry',1,1611),
 ('lekl112.pdf','Poems by Milton','John Milton','kaleidoscope','poetry',2,1612),
 ('lekl113.pdf','Poems by Blake','William Blake','kaleidoscope','poetry',3,1613),
 ('lekl114.pdf','Kubla Khan','S. T. Coleridge','kaleidoscope','poetry',4,1614),
 ('lekl115.pdf','Trees','Emily Dickinson','kaleidoscope','poetry',5,1615),
 ('lekl116.pdf','The Wild Swans at Coole','W. B. Yeats','kaleidoscope','poetry',6,1616),
 ('lekl117.pdf','Time and Time Again','A. K. Ramanujan','kaleidoscope','poetry',7,1617),
 ('lekl118.pdf','Blood','Kamala Das','kaleidoscope','poetry',8,1618),
 ('lekl121.pdf','Freedom','George Bernard Shaw','kaleidoscope','non-fiction',1,1621),
 ('lekl122.pdf','The Mark on the Wall','Virginia Woolf','kaleidoscope','non-fiction',2,1622),
 ('lekl123.pdf','Film-making','Ingmar Bergman','kaleidoscope','non-fiction',3,1623),
 ('lekl124.pdf','Why the Novel Matters','D. H. Lawrence','kaleidoscope','non-fiction',4,1624),
 ('lekl125.pdf','The Argumentative Indian','Amartya Sen','kaleidoscope','non-fiction',5,1625),
 ('lekl126.pdf','On Science Fiction','Isaac Asimov','kaleidoscope','non-fiction',6,1626),
 ('lekl131.pdf','Chandalika','Rabindranath Tagore','kaleidoscope','drama',1,1631),
 ('lekl132.pdf','Broken Images','Girish Karnad','kaleidoscope','drama',2,1632),
 ('levt101.pdf','The Third Level','Jack Finney','vistas','readings',1,1701),
 ('levt102.pdf','The Tiger King','Kalki','vistas','readings',2,1702),
 ('levt103.pdf','Journey to the End of the Earth','Tishani Doshi','vistas','readings',3,1703),
 ('levt104.pdf','The Enemy','Pearl S. Buck','vistas','readings',4,1704),
 ('levt105.pdf','On the Face of It','Susan Hill','vistas','readings',5,1705),
 ('levt106.pdf','Memories of Childhood','Zitkala-Sa and Bama','vistas','readings',6,1706),
]


def load_js(name, marker):
    text = (ROOT / name).read_text(encoding='utf-8')
    assert text.count(marker) == 1
    raw = text.split(marker, 1)[1].strip()
    assert raw.endswith(';')
    return json.loads(raw[:-1])


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def normal(text):
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '', text)


def bilingual(value):
    return isinstance(value, dict) and all(isinstance(value.get(k), str) and value[k].strip() for k in ('en','hi'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--uploads', type=Path)
    args = parser.parse_args()
    sources = load_js('assets/js/data/english12-sources.js', 'UP.english12Sources = ')
    chapters = load_js('assets/js/data/english12.js', 'UP.course12english = ')
    assert len(sources) == len(chapters) == len(EXPECTED) == 40
    assert len({s['id'] for s in sources}) == len({s['file'] for s in sources}) == 40
    assert {s['originalFile'] for s in sources} == {x[0] for x in EXPECTED}
    assert {c['id'] for c in chapters} == {x[-1] for x in EXPECTED}
    by_name = {s['originalFile']: s for s in sources}
    by_id = {c['id']: c for c in chapters}
    for name,title,author,book,section,n,chapter_id in EXPECTED:
        source, chapter = by_name[name], by_id[chapter_id]
        assert (source['book'],source['section'],source['chapter'],source['chapterId'],source['lang']) == (book,section,n,chapter_id,'en'), name
        assert source['id'] == f'{book}-{section}-{n}' and chapter['sourceId'] == source['id']
        assert (chapter['book'],chapter['section'],chapter['n'],chapter['en']) == (book,section,n,title)
        assert normal(author) in normal(chapter['author']), name
        assert source['file'] == f'/assets/books/english12/{book}/{name}'
        assert all(bilingual(chapter[k]) for k in ('bookTitle','sectionTitle'))
        assert chapter['enDesc'].strip() and chapter['hiDesc'].strip()
        assert len(chapter['focus']) == len(chapter['review']) == 2
        assert all(bilingual(v) for v in chapter['focus'] + chapter['review'])
        path = ROOT / source['file'].lstrip('/')
        assert path.is_file() and not path.is_symlink() and path.resolve().is_relative_to(ROOT.resolve())
        assert path.read_bytes()[:5] == b'%PDF-' and path.stat().st_size == source['bytes']
        assert digest(path) == source['sha256'], name
        with pymupdf.open(path) as doc:
            assert len(doc) == source['pages'] and len(doc) > 0
            head = normal(' '.join(p.get_text() for p in list(doc)[:3]))
            assert normal(title) in head, (name,'title')
            assert normal(author) in head, (name,'author')
            text = '\n'.join(p.get_text() for p in doc)
            mark = '2026-27' if 'Reprint 2026-27' in text else None
            assert source['reprint'] == mark, (name,'reprint')
            if name == 'lekl112.pdf':
                assert normal('On Time') in normal(text) and normal('On Shakespear') in normal(text)
            if name == 'lekl113.pdf':
                assert normal('The Divine Image') in normal(text) and normal('The Human Abstract') in normal(text)
            if name == 'levt106.pdf':
                assert normal('The Cutting of My Long Hair') in normal(text) and normal('We Too are Human Beings') in normal(text)
        if args.uploads:
            orig = args.uploads / name
            assert orig.is_file() and digest(orig) == source['sha256'], name
        print('PASS', name, book, section, n, title, '|', source['pages'], 'PDF pages | SHA-256 matches', flush=True)
    assert sum(1 for s in sources if s['reprint']=='2026-27') == 35
    assert {c['id'] for c in chapters if c['cbse2026ElectiveListed'] is False} == {1604,1605,1618,1626,1632}
    notes = {s['originalFile']: by_id[s['chapterId']].get('sourceNote') for s in sources}
    assert {name for name,note in notes.items() if note} == {'lefl101.pdf','lefl111.pdf','lekl101.pdf','lekl111.pdf','lekl112.pdf','lekl113.pdf','lekl116.pdf','lekl121.pdf','lekl131.pdf','levt106.pdf'}
    assert all(bilingual(note) for note in notes.values() if note)
    assert 'On Time' in notes['lekl112.pdf']['en'] and 'On Shakespear' in notes['lekl112.pdf']['en']
    assert 'The Divine Image' in notes['lekl113.pdf']['en'] and 'The Human Abstract' in notes['lekl113.pdf']['en']
    assert 'The Cutting of My Long Hair' in notes['levt106.pdf']['en'] and 'We Too are Human Beings' in notes['levt106.pdf']['en']
    print('PASS 13 Flamingo + 6 Vistas + 21 Kaleidoscope original PDFs; multi-work selections and introductions labelled')
    print('PASS 35 files carry a 2026–27 reprint mark; the other five make no edition claim')
    print('Not a review of all textbook content, literary interpretations, or complete board syllabus.')


if __name__ == '__main__':
    main()
