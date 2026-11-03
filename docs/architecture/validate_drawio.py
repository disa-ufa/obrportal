"""Offline structural/navigation validation. Run from any directory with Python 3."""
from pathlib import Path
import collections
import subprocess
import xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BASE_SHA = '44a189c6581fe1b6f0fcfe68dbda4d53b00ef7f8'
PREFIX = f'https://github.com/disa-ufa/obrportal/blob/{BASE_SHA}/'


def check():
    path = HERE / 'obrportal-architecture.drawio'
    raw = path.read_bytes()
    assert b'<!DOCTYPE' not in raw and b'<!ENTITY' not in raw, 'Unexpected XML declaration'
    root = ET.fromstring(raw)
    assert root.tag == 'mxfile' and root.get('compressed') == 'false'
    pages = root.findall('diagram')
    ids = [p.get('id') for p in pages]
    assert len(ids) == len(set(ids)) == 9
    assert root.get('pages') == str(len(pages))
    links = collections.Counter()
    source_paths = set()
    for page in pages:
        model = page.find('mxGraphModel')
        assert model is not None
        graph = model.find('root')
        cell_ids = [e.get('id') for e in graph.iter() if e.get('id')]
        assert len(cell_ids) == len(set(cell_ids)), page.get('name')
        assert {'0', '1'} <= set(cell_ids)
        targets = set()
        vertices = []
        for el in graph.iter():
            for ref in ('parent', 'source', 'target'):
                assert not el.get(ref) or el.get(ref) in cell_ids, (page.get('id'), ref)
            if el.tag == 'mxCell' and el.get('edge') == '1':
                assert el.get('source') and el.get('target'), 'Detached connector'
            if el.tag == 'mxCell' and el.get('vertex') == '1':
                g = el.find('mxGeometry')
                assert g is not None
                x, y, w, h = [float(g.get(a, 0)) for a in ('x', 'y', 'width', 'height')]
                assert x >= 0 and y >= 0 and w > 0 and h > 0
                assert x+w <= 1400 and y+h <= 900, 'Shape outside page'
                assert not any(s in el.get('style', '') for s in ('locked=1', 'movable=0', 'editable=0', 'shape=image'))
                vertices.append((x, y, w, h))
            link = el.get('link')
            if link:
                if link.startswith('data:page/id,'):
                    target = link.split(',', 1)[1]
                    assert target in ids, link
                    targets.add(target)
                    links['page'] += 1
                else:
                    assert link.startswith(PREFIX), link
                    source_paths.add(link.removeprefix(PREFIX))
                    links['source'] += 1
        assert set(ids) == targets, 'Each page must link to every page, including overview'
        for i, (x,y,w,h) in enumerate(vertices):
            for a,b,c,d in vertices[i+1:]:
                assert min(x+w,a+c) <= max(x,a) or min(y+h,b+d) <= max(y,b), 'Overlapping shapes'
        print(page.get('name'), ':', len(vertices), 'editable shapes')
    for source in sorted(source_paths):
        subprocess.run(['git', 'cat-file', '-e', f'{BASE_SHA}:{source}'], cwd=REPO, check=True, capture_output=True)
    print(f'PASS: {len(pages)} pages; {links["page"]} page links; {links["source"]} source links; {len(source_paths)} unique source paths at {BASE_SHA}')


if __name__ == '__main__':
    check()
