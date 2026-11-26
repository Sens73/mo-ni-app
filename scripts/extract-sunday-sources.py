"""Read Sunday worksheet cage edges and function-bearing green separators."""
from pathlib import Path
import re, json, hashlib
here = Path(__file__).resolve().parent
from orte import ordner
worksheets = ordner('Sonntagsrätsel mit MO und Ni') / 'Arbeitsblätter'
src = worksheets / 'Sonntagsrätsel 01 – Sumdoku.tex'
text = src.read_text(); levels = []
for index, name in enumerate(['One', 'Two', 'Three', 'Four', 'Five']):
    chunk = text.split('\\newcommand{\\Puzzle'+name+'}')[1].split('\\newcommand')[0]
    n = int(re.search(r'\\SumGrid\{(\d+)\}', chunk)[1]); blocked = set()
    for points in re.findall(r'\\draw\[cage\]\s*([^;]+);', chunk):
        coords = [tuple(map(int, v)) for v in re.findall(r'\((\d+),(\d+)\)', points)]
        for (x, y), (a, b) in zip(coords, coords[1:]):
            if x == a:
                for row in range(min(y, b), max(y, b)):
                    if 0 < x < n: blocked.add(tuple(sorted([row*n+x-1, row*n+x])))
            elif y == b:
                for col in range(min(x, a), max(x, a)):
                    if 0 < y < n: blocked.add(tuple(sorted([(y-1)*n+col, y*n+col])))
            else: raise ValueError('Non-orthogonal cage edge')
    groups = []; remaining = set(range(n*n))
    while remaining:
        start = min(remaining); g = {start}; todo = [start]; remaining.remove(start)
        while todo:
            i = todo.pop(); r, c = divmod(i, n)
            for j in [i-n if r else -1, i+n if r+1<n else -1, i-1 if c else -1, i+1 if c+1<n else -1]:
                if j in remaining and tuple(sorted([i, j])) not in blocked:
                    remaining.remove(j); g.add(j); todo.append(j)
        groups.append({'cells': sorted(g), 'sum': None})
    for x, y, total in re.findall(r'\\node\[clue\] at \((\d+),(\d+)\) \{(\d+)\}', chunk):
        g = next(g for g in groups if int(y)*n+int(x) in g['cells'])
        assert g['sum'] is None; g['sum'] = int(total)
    levels.append({'size': n, 'givens': {}, 'cages': groups, 'source': {'worksheet': src.name, 'worksheetTask': index+1, 'stars': index+1, 'sourceSha256': hashlib.sha256(src.read_bytes()).hexdigest()}})
(here/'sunday-sumdoku-template.json').write_text(json.dumps(levels, ensure_ascii=False, indent=2)+'\n')
cross = (worksheets/'Sonntagsrätsel 03 – Zahlenkreuze.tex').read_text()
hits = list(re.finditer(r'Rätsel ([1-5])(?:\\quad|\})', cross)); decorations = {}
for k, hit in enumerate(hits):
    number = hit[1]
    if number in decorations: continue
    chunk = cross[hit.start():hits[k+1].start() if k+1<len(hits) else len(cross)].split('\\end{tikzpicture}')[0]
    green = re.findall(r'\\draw\[[^\n]+?fill=BrandGreen!70[^\n]+?\]\s*\((\d+),(\d+)\) rectangle \((\d+),(\d+)\)', chunk)
    white = re.findall(r'\\draw\[gridcell\] \((\d+),(\d+)\) rectangle', chunk)
    fields = {(int(x), int(y)) for x, y in white}; cells = set()
    for x, y, a, b in green:
        cells.update((i, j) for i in range(int(x), int(a)) for j in range(int(y), int(b)) if (i, j) not in fields)
    decorations[number] = [{'x':x,'y':y} for x,y in sorted(cells, key=lambda p:(p[1],p[0]))]
assert len(decorations) == 5
(here/'sunday-cross-decorations.json').write_text(json.dumps(decorations, indent=2)+'\n')
# Reuse the source parser in memory, without running its historical JSON writer.
# The published pack owns its own current transcription and source checksums.
parser = (here/'extract-beast-templates.py').read_text()
marker = "(HERE/'beast-academy-templates.json').write_text"
assert marker in parser
namespace = {'__file__': str(here/'extract-beast-templates.py')}
exec(compile(parser.split(marker)[0], str(here/'extract-beast-templates.py'), 'exec'), namespace)
packs = {kind: namespace['packs'][kind] for kind in ['cross', 'number-path', 'poly', 'pyramid', 'deka']}
(here/'sunday-number-templates.json').write_text(json.dumps(packs, ensure_ascii=False, indent=2)+'\n')
sources = {}
for number, title in [(1,'Sumdoku'),(2,'Zahlenpfade'),(3,'Zahlenkreuze'),(4,'Polyominos'),(5,'Differenzpyramiden'),(6,'Deka Dots')]:
    file = worksheets / f'Sonntagsrätsel {number:02} – {title}.tex'
    sources[file.name] = hashlib.sha256(file.read_bytes()).hexdigest()
(here/'sunday-source-hashes.json').write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n')
print('Five Sumdoku cage maps and cross separators:', {k:len(v) for k,v in decorations.items()})
