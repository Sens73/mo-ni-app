<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

function fail(string $message, int $code = 1): never
{
    fwrite(STDERR, "Knobelreise: {$message}\n");
    exit($code);
}

function option(array $options, string $name): string
{
    $value = $options[$name] ?? '';
    if (!is_string($value) || trim($value) === '') {
        fail("Die Angabe --{$name}=... fehlt.", 2);
    }
    return $value;
}

function readJsonFile(string $path): array
{
    if (!is_file($path) || !is_readable($path)) fail("Datei nicht lesbar: {$path}");
    $value = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    if (!is_array($value)) fail("Ungültige JSON-Datei: {$path}");
    return $value;
}

function fetchText(string $url): string
{
    if (function_exists('curl_init')) {
        $handle = curl_init($url);
        curl_setopt_array($handle, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_USERAGENT => 'MO-Ni-Grundschul-App/0.10.0',
        ]);
        $body = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);
        if (!is_string($body) || $status < 200 || $status >= 300) {
            fail("YouTube-RSS nicht erreichbar (HTTP {$status}{$error}).");
        }
        return $body;
    }

    $context = stream_context_create(['http' => [
        'timeout' => 30,
        'follow_location' => 1,
        'user_agent' => 'MO-Ni-Grundschul-App/0.10.0',
    ]]);
    $body = @file_get_contents($url, false, $context);
    if (!is_string($body)) fail('YouTube-RSS nicht erreichbar.');
    return $body;
}

function shorten(string $value, int $limit): string
{
    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        return mb_strlen($value) > $limit ? rtrim(mb_substr($value, 0, $limit - 1)) . '…' : $value;
    }
    return strlen($value) > $limit ? rtrim(substr($value, 0, $limit - 3)) . '...' : $value;
}

function parseFeed(string $xmlText, int $startSequence): array
{
    libxml_use_internal_errors(true);
    $xml = simplexml_load_string($xmlText, SimpleXMLElement::class, LIBXML_NOCDATA | LIBXML_NONET);
    if ($xml === false) fail('YouTube-RSS enthält kein gültiges XML.');

    $videos = [];
    foreach ($xml->entry as $entry) {
        $title = trim((string) $entry->title);
        if (!preg_match('/\bNI(\d{6})\b/i', $title, $match)) continue;
        $sequence = (int) $match[1];
        if ($sequence < $startSequence) continue;

        $yt = $entry->children('http://www.youtube.com/xml/schemas/2015');
        $media = $entry->children('http://search.yahoo.com/mrss/');
        $videoId = trim((string) $yt->videoId);
        $publishedAt = trim((string) $entry->published);
        if ($videoId === '' || $publishedAt === '') continue;

        $parts = array_values(array_filter(array_map('trim', explode('|', $title))));
        $shortTitle = $parts[1] ?? trim((string) preg_replace('/\bNI\d{6}\b\s*[-–—|:]?\s*/i', '', $title));
        $description = trim((string) ($media->group->description ?? ''));
        $paragraphs = preg_split('/\R\s*\R/u', $description) ?: [];
        $summary = shorten(trim((string) ($paragraphs[0] ?? '')), 220);

        $videos[] = [
            'code' => 'NI' . $sequence,
            'sequence' => $sequence,
            'title' => $shortTitle !== '' ? $shortTitle : 'Etappe ' . $sequence,
            'fullTitle' => $title,
            'summary' => $summary,
            'videoId' => $videoId,
            'url' => 'https://www.youtube.com/watch?v=' . $videoId,
            'thumbnail' => 'https://i.ytimg.com/vi/' . $videoId . '/hqdefault.jpg',
            'publishedAt' => (new DateTimeImmutable($publishedAt))->format(DateTimeInterface::ATOM),
        ];
    }
    usort($videos, fn(array $a, array $b): int => $b['sequence'] <=> $a['sequence']);
    return $videos;
}

function isSchoolHoliday(string $date, array $matheAg): bool
{
    foreach ($matheAg['schoolHolidays'] ?? [] as $period) {
        if ($date >= (string) ($period['start'] ?? '') && $date <= (string) ($period['end'] ?? '')) return true;
    }
    return false;
}

function isMatheAgDate(string $date, array $schedule): bool
{
    $matheAg = $schedule['matheAg'] ?? [];
    $candidate = new DateTimeImmutable($date, new DateTimeZone('UTC'));
    if ((int) $candidate->format('w') !== (int) ($matheAg['weekday'] ?? 1)) return false;
    $week = (int) $candidate->format('W');
    $parity = (string) ($matheAg['isoWeekParity'] ?? 'even');
    if ($parity === 'even' && $week % 2 !== 0) return false;
    if ($parity === 'odd' && $week % 2 !== 1) return false;
    if (($matheAg['skipDuringSchoolHolidays'] ?? true) && isSchoolHoliday($date, $matheAg)) return false;
    return true;
}

function excludedDates(array $journey, array $content): array
{
    $dates = array_fill_keys($journey['schedule']['excludedVideoDates'] ?? [], true);
    foreach ($content['dates'] ?? [] as $entry) {
        if (($entry['type'] ?? '') === 'Video-Pause' && isset($entry['date'])) $dates[(string) $entry['date']] = true;
    }
    return $dates;
}

function nextSlot(DateTimeImmutable $now, array $schedule, array $excluded): string
{
    $zone = new DateTimeZone((string) ($schedule['timeZone'] ?? 'Europe/Berlin'));
    $localNow = $now->setTimezone($zone);
    $weekdays = array_map('intval', $schedule['weekdays'] ?? [2, 4]);
    $time = (string) ($schedule['time'] ?? '14:00');
    for ($offset = 0; $offset <= 14; $offset++) {
        $date = $localNow->modify("+{$offset} days")->format('Y-m-d');
        $candidate = new DateTimeImmutable("{$date} {$time}:00", $zone);
        $weekday = (int) $candidate->format('w');
        if (!in_array($weekday, $weekdays, true) || isset($excluded[$date])) continue;
        if ($weekday === 2 && ($schedule['skipTuesdayAfterMatheAg'] ?? false)) {
            $monday = $candidate->modify('-1 day')->format('Y-m-d');
            if (isMatheAgDate($monday, $schedule)) continue;
        }
        if ($candidate > $now) {
            return $candidate->setTimezone(new DateTimeZone('UTC'))->format('Y-m-d\TH:i:s.v\Z');
        }
    }
    fail('Kein nächster Veröffentlichungstermin gefunden.');
}

function mergeJourney(array $journey, array $feedVideos, array $content, DateTimeImmutable $now): array
{
    $startSequence = (int) preg_replace('/^NI/i', '', (string) ($journey['startCode'] ?? 'NI650311'));
    $byCode = [];
    foreach ($journey['videos'] ?? [] as $video) $byCode[(string) $video['code']] = $video;

    foreach ($feedVideos as $video) {
        if ($video['sequence'] < $startSequence || new DateTimeImmutable($video['publishedAt']) > $now) continue;
        $previous = $byCode[$video['code']] ?? [];
        $video['summary'] = $previous['summary'] ?? $video['summary'];
        $video['publishedAt'] = $previous['publishedAt'] ?? $video['publishedAt'];
        $byCode[$video['code']] = array_merge($previous, $video);
    }

    $videos = array_values($byCode);
    usort($videos, fn(array $a, array $b): int => ((int) $b['sequence']) <=> ((int) $a['sequence']));
    $latestSequence = $startSequence - 1;
    foreach ($videos as $video) $latestSequence = max($latestSequence, (int) $video['sequence']);
    $publishedCodes = array_fill_keys(array_keys($byCode), true);
    $nextCode = '';
    foreach ($journey['publicationSequence'] ?? [] as $candidateCode) {
        if (!isset($publishedCodes[(string) $candidateCode])) {
            $nextCode = (string) $candidateCode;
            break;
        }
    }
    $nextSequence = $nextCode !== '' ? (int) preg_replace('/^NI/i', '', $nextCode) : $latestSequence + 1;
    if ($nextCode === '') $nextCode = 'NI' . $nextSequence;
    $editorial = $journey['nextPublication'] ?? [];
    $editorialDate = isset($editorial['scheduledAt']) ? new DateTimeImmutable((string) $editorial['scheduledAt']) : null;
    $keepEditorial = ($editorial['confirmed'] ?? false) === true
        && (int) ($editorial['sequence'] ?? 0) === $nextSequence
        && $editorialDate !== null
        && $editorialDate > $now;

    $journey['updatedAt'] = $now->format(DateTimeInterface::ATOM);
    $journey['videos'] = $videos;
    if (!$keepEditorial) {
        $journey['nextPublication'] = [
            'code' => $nextCode,
            'sequence' => $nextSequence,
            'title' => 'Neues Knobelvideo',
            'scheduledAt' => nextSlot($now, $journey['schedule'] ?? [], excludedDates($journey, $content)),
            'videoId' => '',
            'url' => '',
            'source' => 'schedule',
            'confirmed' => false,
        ];
    }
    return $journey;
}

$options = getopt('', ['journey:', 'content:', 'dry-run']);
$journeyPath = option($options, 'journey');
$contentPath = option($options, 'content');
$dryRun = array_key_exists('dry-run', $options);
$lockPath = sys_get_temp_dir() . '/mo-ni-knobelreise-' . hash('sha256', realpath($journeyPath) ?: $journeyPath) . '.lock';
$lock = fopen($lockPath, 'c');
if ($lock === false || !flock($lock, LOCK_EX | LOCK_NB)) fail('Ein anderer Abgleich läuft bereits.');

try {
    $journey = readJsonFile($journeyPath);
    $content = readJsonFile($contentPath);
    $startSequence = (int) preg_replace('/^NI/i', '', (string) ($journey['startCode'] ?? 'NI650311'));
    $videos = parseFeed(fetchText((string) $journey['feedUrl']), $startSequence);
    $updated = mergeJourney($journey, $videos, $content, new DateTimeImmutable('now'));
    $json = json_encode($updated, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
    if (!$dryRun) {
        $temporary = tempnam(dirname($journeyPath), '.journey-');
        $permissions = fileperms($journeyPath);
        if ($temporary !== false && is_int($permissions)) chmod($temporary, $permissions & 0777);
        if ($temporary === false || file_put_contents($temporary, $json, LOCK_EX) === false || !rename($temporary, $journeyPath)) {
            if (isset($temporary) && is_file($temporary)) unlink($temporary);
            fail('journey.json konnte nicht atomar gespeichert werden.');
        }
    }
    $mode = $dryRun ? 'Trockenlauf' : 'Aktualisiert';
    fwrite(STDOUT, sprintf("%s: %d Videos; nächste Etappe %s.\n", $mode, count($updated['videos']), $updated['nextPublication']['code']));
} finally {
    flock($lock, LOCK_UN);
    fclose($lock);
}
