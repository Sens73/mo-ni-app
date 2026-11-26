import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

MODULE = Path(__file__).resolve().parents[1] / 'sync-workbook.py'
spec = importlib.util.spec_from_file_location('sync_workbook', MODULE)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
APP = Path(__file__).resolve().parent / 'fixtures'
NOW = sync.date('2026-10-04T12:00:00Z')

def feed(entries=(), channel=None):
    channel = channel or sync.CHANNEL
    return (f'<feed xmlns="{sync.NS["a"]}" xmlns:yt="{sync.NS["yt"]}">'
            f'<yt:channelId>{channel}</yt:channelId><author><uri>https://www.youtube.com/channel/{sync.CHANNEL}</uri></author>'
            + ''.join(f'<entry><title>{code} | Testthema</title><yt:channelId>{sync.CHANNEL}</yt:channelId>'
                      f'<yt:videoId>{video_id}</yt:videoId><published>{published}</published></entry>'
                      for code, video_id, published in entries) + '</feed>').encode()

class SynchronizationTest(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        (self.root / 'data').mkdir()
        for name in ('content', 'journey'):
            (self.root / f'data/{name}.json').write_bytes((APP / f'data/{name}.json').read_bytes())

    def test_future_and_other_channel_excluded(self):
        self.assertEqual(sync.parse_feed(feed([('NI650324', 'ABCDEFGHIJK', '2026-10-06T12:00:00Z')]), NOW), [])
        with self.assertRaises(ValueError):
            sync.parse_feed(feed(channel='UCotherchannel'), NOW)
        self.assertEqual(sync.parse_feed(feed(channel=sync.CHANNEL[2:]), NOW), [])

    def test_ambiguous_task_aborts(self):
        with self.assertRaises(ValueError):
            sync.parse_feed(feed([('NI650324', 'ABCDEFGHIJK', '2026-10-01T12:00:00Z'),
                                  ('NI650324', 'LMNOPQRSTUV', '2026-10-01T12:00:00Z')]), NOW)

    def test_schedule_respects_ag_holidays_and_dst(self):
        journey = sync.read_json(APP / 'data/journey.json')
        self.assertEqual(sync.next_slot(sync.date('2026-09-27T12:00:00Z'), journey['schedule'], {}), '2026-10-01T12:00:00.000Z')
        self.assertEqual(sync.next_slot(sync.date('2026-10-11T12:00:00Z'), journey['schedule'], {}), '2026-10-13T12:00:00.000Z')
        self.assertEqual(sync.next_slot(sync.date('2026-11-01T12:00:00Z'), journey['schedule'], {}), '2026-11-03T13:00:00.000Z')

    def test_whole_chain_and_unchanged_repeat(self):
        content_before = sync.read_json(self.root / 'data/content.json')
        result = sync.synchronize(self.root, NOW, feed())
        self.assertEqual(result['workbookVideos'], 9)
        content_after = sync.read_json(self.root / 'data/content.json')
        self.assertEqual({k:v for k,v in content_after.items() if k != 'workbooks'},
                         {k:v for k,v in content_before.items() if k != 'workbooks'})
        pdf = self.root / result['pdfUrl'][2:]
        before = {p: (p.stat().st_mtime_ns, p.read_bytes()) for p in (pdf, self.root / 'data/content.json', self.root / 'data/journey.json')}
        again = sync.synchronize(self.root, NOW, feed())
        self.assertEqual(again['mode'], 'Unverändert')
        self.assertEqual(before, {p:(p.stat().st_mtime_ns,p.read_bytes()) for p in before})

    def test_public_video_creates_new_pdf_and_retains_previous(self):
        old = sync.synchronize(self.root, NOW, feed())
        result = sync.synchronize(self.root, NOW, feed([('NI650324', 'ABCDEFGHIJK', '2026-10-03T12:00:00Z')]))
        self.assertEqual(result['workbookVideos'], 10)
        self.assertNotEqual(result['pdfUrl'], old['pdfUrl'])
        self.assertTrue((self.root / old['pdfUrl'][2:]).exists())
        journey = sync.read_json(self.root / 'data/journey.json')
        # Keine festen Termine mehr: ohne bestätigte Premiere wird nichts angekündigt.
        self.assertIsNone(journey['nextPublication'])

    def test_fixed_slots_only_when_switched_on(self):
        journey_path = self.root / 'data/journey.json'
        journey = sync.read_json(journey_path)
        journey['schedule']['announceSlots'] = True
        journey_path.write_text(json.dumps(journey, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        sync.synchronize(self.root, NOW, feed([('NI650324', 'ABCDEFGHIJK', '2026-10-03T12:00:00Z')]))
        self.assertEqual(sync.read_json(journey_path)['nextPublication']['code'], 'NI650325')

    def test_invalid_feed_keeps_public_files(self):
        before = {p:p.read_bytes() for p in (self.root / 'data').iterdir()}
        with self.assertRaises(Exception):
            sync.synchronize(self.root, NOW, b'<broken')
        self.assertEqual(before, {p:p.read_bytes() for p in before})

    def test_pdf_failure_keeps_public_pointers(self):
        before = {p:p.read_bytes() for p in (self.root / 'data').iterdir()}
        with patch.object(sync, 'render_workbook', side_effect=OSError('simulierter Schreibfehler')):
            with self.assertRaises(OSError):
                sync.synchronize(self.root, NOW, feed())
        self.assertEqual(before, {p:p.read_bytes() for p in before})

    def test_dry_run_has_no_mutations(self):
        before = {p:p.read_bytes() for p in (self.root / 'data').iterdir()}
        result = sync.synchronize(self.root, NOW, feed(), dry_run=True)
        self.assertEqual(result['mode'], 'Trockenlauf')
        self.assertEqual(len(list(self.root.glob('*.pdf'))), 0)
        self.assertEqual(before, {p:p.read_bytes() for p in before})

    def test_finished_workbook_has_no_invented_next_task(self):
        journey = sync.read_json(APP / 'data/journey.json')
        prototype = journey['videos'][0]
        journey['videos'] = [{**prototype, 'code': code, 'sequence': int(code[2:])} for code in journey['publicationSequence']]
        result = sync.merge_journey(journey, [], {}, NOW)
        self.assertIsNone(result['nextPublication'])

if __name__ == '__main__':
    unittest.main()
