#!/usr/bin/env python3
"""Export the centrally built workbook and its source-defined video positions."""
import argparse
import hashlib
import json
import re
from pathlib import Path
from pypdf import PdfReader, PdfWriter
from pypdf.generic import ArrayObject, NameObject

MM = 72 / 25.4

def prepare(source, pdf, destination):
    # The source is keyed by task code, not the potentially repeated height.
    positions = {code: float(height) for height, code in re.findall(
        r"\\videomarke\{([\d.]+)mm\}\{(\d{6})\}\{[1-6]\}", source.read_text())}
    if len(positions) != 36:
        raise ValueError("Die MO65-Quelle muss genau 36 Videopositionen enthalten.")
    reader = PdfReader(pdf)
    writer = PdfWriter(clone_from=reader)
    fields = []
    for number, page in enumerate(writer.pages):
        keep = []
        for ref in page.get('/Annots', []):
            annotation = ref.get_object()
            uri = str(annotation.get('/A', {}).get('/URI', ''))
            if not uri.startswith('https://mo-ni.invalid/NI'):
                keep.append(ref)
                continue
            code = uri.rsplit('/', 1)[-1]
            if code[2:] not in positions:
                raise ValueError(f"Unbekannte Positionsmarke: {code}")
            top = float(page.mediabox.top) - (positions[code[2:]] + 6) * MM
            if abs(float(annotation['/Rect'][3]) - top) > 1.5:
                raise ValueError(f"Positionsmarke und Quelle widersprechen sich: {code}")
            fields.append({'code': code, 'page': number + 1, 'left': 7 * MM,
                           'top': top, 'width': 15 * MM, 'height': 23 * MM})
        page[NameObject('/Annots')] = ArrayObject(keep)
    if len(fields) != 36 or len({x['code'] for x in fields}) != 36:
        raise ValueError("36 eindeutige Positionsmarken erwartet.")
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / 'MO65-Basis.pdf'
    writer.write(target)
    manifest = {'year': 'MO65', 'template': target.name,
                'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                'pages': len(writer.pages),
                'pageSizes': [[float(p.mediabox.width), float(p.mediabox.height)] for p in writer.pages],
                'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'fields': fields}
    (destination / 'MO65.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f"MO65: {len(writer.pages)} Seiten, {len(fields)} geprüfte Videopositionen.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--pdf', type=Path, required=True)
    parser.add_argument('--destination', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.source, args.pdf, args.destination)
