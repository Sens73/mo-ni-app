#!/usr/bin/env python3
"""CLI-only YouTube -> journey -> validated, versioned workbook -> App pointer.

The task pages come from an immutable, centrally built TeX template. Only the
36 source-defined video fields are drawn on it. No YouTube credentials needed.
"""
import argparse
import copy
import fcntl
import hashlib
import json
import os
import re
import sys
import tempfile
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

# Bundled pure-Python libraries allow deployment without pip or administrator rights.
VENDOR = Path(__file__).resolve().parent / 'vendor'
if VENDOR.is_dir():
    sys.path.insert(0, str(VENDOR))
import segno
from pypdf import PdfReader, PdfWriter, PageObject
from pypdf.annotations import Link
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject

MM = 72 / 25.4
CHANNEL = 'UCOJb9I7A5OFjwZVGkSk72Rg'
FEED = f'https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL}'
HERE = Path(__file__).resolve().parent
NS = {'a': 'http://www.w3.org/2005/Atom', 'yt': 'http://www.youtube.com/xml/schemas/2015',
      'm': 'http://search.yahoo.com/mrss/'}

def stamp(value):
    return value.astimezone(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')

def date(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Datum ohne Zeitzone.')
    return result

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))

def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')

def atomic_write(path, data):
    """Same-directory replacement; errors leave the original file intact."""
    fd, temporary = tempfile.mkstemp(prefix='.mo-ni-', dir=path.parent)
    try:
        mode = path.stat().st_mode & 0o777 if path.exists() else 0o644
        with os.fdopen(fd, 'wb') as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)

def fetch_feed():
    request = urllib.request.Request(FEED, headers={'User-Agent': 'MO-Ni-Arbeitsheft/1.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read(4_000_001)
    if len(body) > 4_000_000:
        raise ValueError('YouTube-Antwort zu groß.')
    return body

def parse_feed(body, now):
    if b'<!DOCTYPE' in body.upper() or b'<!ENTITY' in body.upper():
        raise ValueError('Unerwartete XML-Deklaration.')
    root = ET.fromstring(body)
    # YouTube sometimes omits the UC prefix at feed level, but keeps it on entries.
    if (root.tag != '{http://www.w3.org/2005/Atom}feed'
        or root.findtext('yt:channelId', namespaces=NS) not in (CHANNEL, CHANNEL[2:])
        or root.findtext('a:author/a:uri', namespaces=NS) != f'https://www.youtube.com/channel/{CHANNEL}'):
        raise ValueError('Kein Feed des freigegebenen MO-Ni-Kanals.')
    videos = {}
    for entry in root.findall('a:entry', NS):
        title = (entry.findtext('a:title', namespaces=NS) or '').strip()
        match = re.search(r'\bNI(\d{6})\b', title, re.I)
        if not match:
            continue
        if entry.findtext('yt:channelId', namespaces=NS) != CHANNEL:
            raise ValueError('Ein Video stammt aus einem anderen Kanal.')
        video_id = entry.findtext('yt:videoId', namespaces=NS) or ''
        published = entry.findtext('a:published', namespaces=NS) or ''
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
            raise ValueError('Ungültige YouTube-Kennung.')
        if date(published) > now:
            continue
        code = 'NI' + match[1]
        if code in videos and videos[code]['videoId'] != video_id:
            raise ValueError(f'Mehrere öffentliche Videos für {code}; Zuordnung prüfen.')
        parts = [x.strip() for x in title.split('|') if x.strip()]
        description = entry.findtext('m:group/m:description', namespaces=NS) or ''
        summary = re.split(r'\n\s*\n', description.strip())[0][:220]
        videos[code] = {'code': code, 'sequence': int(match[1]),
                        'title': parts[1] if len(parts) > 1 else re.sub(r'\bNI\d{6}\b\s*[|:–-]?\s*', '', title),
                        'fullTitle': title, 'summary': summary, 'videoId': video_id,
                        'url': f'https://www.youtube.com/watch?v={video_id}',
                        'thumbnail': f'https://i.ytimg.com/vi/{video_id}/hqdefault.jpg',
                        'publishedAt': stamp(date(published))}
    return list(videos.values())

def is_ag(day, schedule):
    ag = schedule.get('matheAg', {})
    if (day.weekday() + 1) % 7 != ag.get('weekday', 1):
        return False
    parity = ag.get('isoWeekParity', 'even')
    week = day.isocalendar().week
    if parity == 'even' and week % 2 or parity == 'odd' and not week % 2:
        return False
    if ag.get('skipDuringSchoolHolidays', True):
        if any(x['start'] <= day.isoformat() <= x['end'] for x in ag.get('schoolHolidays', [])):
            return False
    return True

def next_slot(now, schedule, content):
    zone = ZoneInfo(schedule.get('timeZone', 'Europe/Berlin'))
    excluded = set(schedule.get('excludedVideoDates', []))
    excluded.update(x['date'] for x in content.get('dates', []) if x.get('type') == 'Video-Pause')
    hour, minute = map(int, schedule.get('time', '14:00').split(':'))
    for offset in range(370):
        day = now.astimezone(zone).date() + timedelta(days=offset)
        weekday = (day.weekday() + 1) % 7
        if weekday not in schedule.get('weekdays', [2, 4]) or day.isoformat() in excluded:
            continue
        if weekday == 2 and schedule.get('skipTuesdayAfterMatheAg') and is_ag(day - timedelta(days=1), schedule):
            continue
        candidate = datetime(day.year, day.month, day.day, hour, minute, tzinfo=zone)
        if candidate > now:
            return stamp(candidate)
    raise ValueError('Kein nächster Veröffentlichungstermin gefunden.')

def merge_journey(journey, incoming, content, now):
    result = copy.deepcopy(journey)
    allowed = set(journey['publicationSequence'])
    by_code = {}
    for video in journey['videos']:
        code = video['code']
        if code in by_code:
            raise ValueError(f'Doppelte vorhandene Kennung: {code}')
        if date(video['publishedAt']) <= now:
            by_code[code] = video
    for video in incoming:
        if video['code'] not in allowed:
            continue
        previous = by_code.get(video['code'], {})
        item = {**previous, **video}
        item['summary'] = previous.get('summary', video['summary'])
        if previous.get('videoId') == video['videoId']:
            item['publishedAt'] = previous['publishedAt']
        by_code[video['code']] = item
    result['videos'] = sorted(by_code.values(), key=lambda x: (date(x['publishedAt']), x['code']), reverse=True)
    next_code = next((code for code in journey['publicationSequence'] if code not in by_code), None)
    editorial = journey.get('nextPublication') or {}
    confirmed_upcoming = (editorial.get('confirmed') and editorial.get('code') == next_code
                          and editorial.get('scheduledAt') and date(editorial['scheduledAt']) > now)
    # Seit 26.11.2026 gibt es für die Knobelreise keine festen Termine mehr: Ein Termin wird nur
    # angekündigt, wenn er bestätigt ist (z. B. geplante YouTube-Premiere). Feste Wochentage nur,
    # wenn der Zeitplan sie ausdrücklich wieder einschaltet ("announceSlots": true).
    if next_code is None or (not confirmed_upcoming and not journey.get('schedule', {}).get('announceSlots')):
        result['nextPublication'] = None
    elif not confirmed_upcoming:
        result['nextPublication'] = {'code': next_code, 'sequence': int(next_code[2:]),
                                    'title': 'Neues Knobelvideo', 'scheduledAt': next_slot(now, journey['schedule'], content),
                                    'videoId': '', 'url': '', 'source': 'schedule', 'confirmed': False}
    if result != journey:
        result['updatedAt'] = stamp(now)
    return result

def workbook_links(journey, manifest, now):
    allowed = {field['code'] for field in manifest['fields']}
    links = {}
    for video in journey['videos']:
        if video['code'] not in allowed or date(video['publishedAt']) > now:
            continue
        video_id = video['videoId']
        if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video_id):
            raise ValueError(f'Ungültiges Video zu {video["code"]}.')
        links[video['code']] = f'https://youtu.be/{video_id}'
    return links

def pdf_text(value):
    return value.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

def field_stream(field, url):
    """Vector frame, standard-font label, and QR; no rasterisation of the workbook."""
    left, top, width = field['left'], field['top'], field['width']
    height = field['height'] if url else 12.6 * MM
    bottom = top - height
    radius, k = 2, 0.55228475
    x, y, w, h, r = left, bottom, width, height, radius
    commands = ['q', '1 1 1 rg', '0.5765 0.6876 0.8059 RG', '0.4 w',
        f'{x+r} {y} m {x+w-r} {y} l',
        f'{x+w-r+r*k} {y} {x+w} {y+r-r*k} {x+w} {y+r} c',
        f'{x+w} {y+h-r} l {x+w} {y+h-r+r*k} {x+w-r+r*k} {y+h} {x+w-r} {y+h} c',
        f'{x+r} {y+h} l {x+r-r*k} {y+h} {x} {y+h-r+r*k} {x} {y+h-r} c',
        f'{x} {y+r} l {x} {y+r-r*k} {x+r-r*k} {y} {x+r} {y} c h B',
        '0 0 0 rg']
    for text, depth, text_width in [('Video zu', 3, 22.34), (f'Aufgabe {field["code"][-1]}', 5.47, 26.69)]:
        commands.append(f'BT /MOFont 6 Tf 1 0 0 1 {left+(width-text_width)/2} {top-depth*MM} Tm ({pdf_text(text)}) Tj ET')
    commands.append('0.078431 0.305882 0.568627 rg')
    if url:
        qr = segno.make_qr(url, error='M', boost_error=False)
        size = 11 * MM
        module = size / len(qr.matrix)
        qr_left = left + (width - size) / 2
        qr_top = top - 8 * MM
        # The surrounding white field supplies a quiet zone exceeding four modules.
        for row, cells in enumerate(qr.matrix):
            for column, dark in enumerate(cells):
                if dark:
                    commands.append(f'{qr_left+column*module:.5f} {qr_top-(row+1)*module:.5f} {module:.5f} {module:.5f} re f')
    else:
        center = left + width / 2
        yy = top - 8.7 * MM
        commands.append(f'{center-2.2} {yy-2.8} m {center+2.7} {yy} l {center-2.2} {yy+2.8} l h f')
        commands.append(f'BT /MOFont 6 Tf 1 0 0 1 {center-6.5} {top-11*MM} Tm (folgt) Tj ET')
    commands.append('Q')
    return '\n'.join(commands).encode('ascii')

def render_workbook(template, manifest, links, target):
    if hashlib.sha256(template.read_bytes()).hexdigest() != manifest['sha256']:
        raise ValueError('Die geprüfte Heftvorlage wurde verändert.')
    reader = PdfReader(template)
    if (len(reader.pages) != manifest['pages'] or len(manifest['fields']) != 36
        or len({field['code'] for field in manifest['fields']}) != 36):
        raise ValueError('Seitenumfang oder Videopositionen stimmen nicht.')
    writer = PdfWriter(clone_from=reader)
    font = DictionaryObject({NameObject('/Type'): NameObject('/Font'), NameObject('/Subtype'): NameObject('/Type1'),
                             NameObject('/BaseFont'): NameObject('/Helvetica')})
    for field in manifest['fields']:
        number = field['page'] - 1
        page = writer.pages[number]
        if not (0 <= field['left'] < field['left'] + field['width'] <= float(page.mediabox.width)
                and 0 <= field['top'] - field['height'] < field['top'] <= float(page.mediabox.height)):
            raise ValueError('Videofeld liegt außerhalb der Seite.')
        url = links.get(field['code'], '')
        overlay = PageObject.create_blank_page(width=float(page.mediabox.width), height=float(page.mediabox.height))
        overlay[NameObject('/Resources')] = DictionaryObject({NameObject('/Font'): DictionaryObject({NameObject('/MOFont'): font})})
        stream = DecodedStreamObject()
        stream.set_data(field_stream(field, url))
        overlay[NameObject('/Contents')] = stream
        page.merge_page(overlay)
        if url:
            writer.add_annotation(number, Link(rect=(field['left'], field['top']-field['height'],
                                                    field['left']+field['width'], field['top']), url=url))
    writer.add_metadata({'/MO-Ni-Videolinks': json.dumps(links, sort_keys=True), '/Producer': 'MO-Ni Arbeitsheft-Automatik'})
    writer.write(target)
    validate_workbook(target, manifest, links)

def validate_workbook(path, manifest, links):
    reader = PdfReader(path)
    if len(reader.pages) != manifest['pages']:
        raise ValueError('Unvollständige PDF; Veröffentlichung abgebrochen.')
    if [[float(p.mediabox.width), float(p.mediabox.height)] for p in reader.pages] != manifest['pageSizes']:
        raise ValueError('PDF-Seitenformate verändert.')
    actual = []
    for page in reader.pages:
        for ref in page.get('/Annots', []):
            uri = str(ref.get_object().get('/A', {}).get('/URI', ''))
            if uri.startswith('https://mo-ni.invalid/'):
                raise ValueError('Positionsmarke in der Ausgabe.')
            if uri.startswith('https://youtu.be/'):
                actual.append(uri)
    if sorted(actual) != sorted(links.values()):
        raise ValueError('PDF-Videolinks stimmen nicht mit den öffentlichen Videos überein.')

def synchronize(app_root, now, feed=None, dry_run=False, data_dir='data', source_tex=None):
    app_root = app_root.resolve()
    data = app_root / data_dir
    journey_path, content_path = data / 'journey.json', data / 'content.json'
    # Same name as the former PHP job, so a remaining old job cannot overlap.
    lock_name = 'mo-ni-knobelreise-' + hashlib.sha256(str(journey_path.resolve()).encode()).hexdigest() + '.lock'
    with open(Path(tempfile.gettempdir()) / lock_name, 'a') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise ValueError('Ein anderer Knobelreise-Abgleich läuft bereits.')
        journey, content = read_json(journey_path), read_json(content_path)
        manifest_path = HERE / 'templates' / 'MO65.json'
        manifest = read_json(manifest_path)
        updated = merge_journey(journey, parse_feed(feed if feed is not None else fetch_feed(), now), content, now)
        links = workbook_links(updated, manifest, now)
        if not links:
            raise ValueError('Keine bestätigten Videos; bestehendes Arbeitsheft bleibt erhalten.')
        fingerprint = {'manifest': manifest, 'links': links,
                       'renderer': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
        revision = hashlib.sha256(json.dumps(fingerprint, sort_keys=True).encode()).hexdigest()[:20]
        name = f'MO65-Arbeitsheft-{revision}.pdf'
        workbooks = copy.deepcopy(content['workbooks'])
        workbooks.update({'pdfUrl': './' + name, 'videoCount': len(links), 'revision': revision,
                          'announcementBody': f'36 Aufgaben für Klasse 3 und 4 aus drei Stufen der Mathematik-Olympiade. '
                          f'{len(links)} Erklärvideos sind bereits direkt im Heft verlinkt. '
                          'Tippe in der PDF auf den QR-Code oder das Videofeld. Im gedruckten Heft scannst du den QR-Code.'})
        target = app_root / name
        needs_pdf = not target.exists()
        if not needs_pdf:
            validate_workbook(target, manifest, links)
            expected_hash = content['workbooks'].get('sha256') if content['workbooks'].get('revision') == revision else None
            if expected_hash and hashlib.sha256(target.read_bytes()).hexdigest() != expected_hash:
                raise ValueError('Die bereitgestellte PDF wurde nachträglich verändert.')
        if dry_run:
            return {'mode': 'Trockenlauf', 'videos': len(updated['videos']), 'workbookVideos': len(links),
                    'newPdf': needs_pdf, 'pdfUrl': workbooks['pdfUrl']}
        # Versioned immutable file first; the old pointer remains usable throughout.
        if needs_pdf:
            fd, scratch = tempfile.mkstemp(prefix='.workbook-', suffix='.pdf', dir=app_root)
            os.close(fd)
            scratch = Path(scratch)
            try:
                render_workbook(HERE / 'templates' / manifest['template'], manifest, links, scratch)
                os.chmod(scratch, 0o644)
                os.replace(scratch, target)
            finally:
                scratch.unlink(missing_ok=True)
        pdf_hash = hashlib.sha256(target.read_bytes()).hexdigest()
        workbooks['sha256'] = pdf_hash
        workbooks['sizeBytes'] = target.stat().st_size
        size_mb = f'{target.stat().st_size / (1024 * 1024):.1f}'.replace('.', ',')
        workbooks['details'] = f'{manifest["pages"]} Seiten · PDF · {size_mb} MB'
        if content['workbooks'] != workbooks:
            workbooks['updatedAt'] = stamp(now)
        else:
            workbooks['updatedAt'] = content['workbooks'].get('updatedAt', stamp(now))
        # Metadata updates must preserve all other App areas.
        latest_content = read_json(content_path)
        if latest_content != content:
            raise ValueError('Inhaltsdaten wurden gleichzeitig bearbeitet; erneuter Lauf nötig.')
        if read_json(journey_path) != journey:
            raise ValueError('Knobelreise wurde gleichzeitig bearbeitet; erneuter Lauf nötig.')
        new_content = {**latest_content, 'workbooks': workbooks}
        # Public videos first; if the final pointer write fails, the next run repairs it.
        if updated != journey:
            atomic_write(journey_path, encoded(updated))
        if new_content != content:
            atomic_write(content_path, encoded(new_content))
        # Optional local TeX mirror for subsequent builds using the same video list.
        if source_tex:
            lines = ['% Automatisch erzeugt; ausschließlich bestätigte öffentliche Videos.']
            lines += [r'\videolink{' + field['code'][2:] + '}{' + links.get(field['code'], '') + '}'
                      for field in manifest['fields']]
            source_bytes = ('\n'.join(lines) + '\n').encode()
            if not source_tex.exists() or source_tex.read_bytes() != source_bytes:
                atomic_write(source_tex, source_bytes)
        return {'mode': 'Aktualisiert' if new_content != content or updated != journey else 'Unverändert',
                'videos': len(updated['videos']), 'workbookVideos': len(links),
                'pdfUrl': workbooks['pdfUrl'], 'sha256': pdf_hash}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--app-root', type=Path, required=True)
    parser.add_argument('--data-dir', default='data', choices=['data', '.'])
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--feed-file', type=Path, help='Nur für nachvollziehbare lokale Proben.')
    parser.add_argument('--now', help='ISO-Zeitpunkt für reproduzierbare Proben.')
    parser.add_argument('--source-tex', type=Path, help='Optionaler lokaler Videolink-Abgleich der TeX-Quelle.')
    args = parser.parse_args()
    try:
        result = synchronize(args.app_root, date(args.now) if args.now else datetime.now(timezone.utc),
                             args.feed_file.read_bytes() if args.feed_file else None,
                             args.dry_run, args.data_dir, args.source_tex)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as error:
        print(f'Arbeitsheft-Automatik: {error}', file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
