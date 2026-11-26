# Automatische Videokarten für Klasse 5/6 und 7–13

**Erweitert am 6. Oktober 2026; noch nicht auf dem öffentlichen Server eingerichtet.**

Nach einmaliger Einrichtung pflegt Andreas die Inhalte über die bestehenden YouTube-Playlists: Video hinzufügen, Titel korrigieren oder ein Video entfernen. Ein Serverauftrag aktualisiert `data/video-playlists.json`. Die App liest diese Datei spätestens beim nächsten fünfminütigen Inhaltsabgleich. Für solche Inhaltsänderungen ist kein TYPO3-Paket erforderlich.

## Einmalige Einrichtung durch die Serverbetreuung

1. Prüfen, ob Node.js mindestens Version 20, ausgehende HTTPS-Verbindungen zu YouTube/Google und ein Zeitauftrag verfügbar sind. PHP allein führt dieses neue Skript nicht aus. Bei einem reinen PHP-Hosting muss die Serverbetreuung einen externen Importdienst oder einen geprüften PHP-Adapter bereitstellen; ein API-Schlüssel im Browser ist keine Alternative.
2. `sync-video-playlists.mjs` außerhalb von `fileadmin` ablegen. Die Konfiguration `video-sources.json` darf ebenfalls außerhalb des öffentlichen Ordners liegen. Das Skript ist eigenständig und braucht keine npm-Pakete. Der Zielpfad muss auf die tatsächlich von Version 0.12 gelesene `data/video-playlists.json` zeigen.
3. Für den dauerhaften Betrieb einen YouTube-Data-API-Schlüssel ausschließlich als Umgebungsvariable `YOUTUBE_API_KEY` des Serverauftrags hinterlegen. Er gehört weder in App-Dateien noch in öffentliche Konfiguration, Befehlszeile oder Protokolle. Die offizielle Abfrage liest alle Seiten mit jeweils bis zu 50 Einträgen. Ohne Schlüssel folgt der öffentliche HTML-Abgleich auch den Playlist-Folgeseiten; die Algebra-Playlist mit 107 Einträgen wurde so vollständig gelesen. Fehlende oder wiederholte Seiten sowie eine abweichende Gesamtzahl brechen den Lauf ab und erhalten den letzten vollständigen Bestand. Änderungen am öffentlichen YouTube-Format bleiben eine Grenze dieses Weges.
4. Einen Probelauf mit absoluten, an den Server angepassten Pfaden ausführen:

   ```text
   /PFAD/node /PRIVATE/sync-video-playlists.mjs --config=/PRIVATE/video-sources.json --output=/PFAD/fileadmin/grundschule-app-test/data/video-playlists.json --dry-run
   ```

   Erwarteter Stand derzeit: `olympiad56` ein Video, offene Klasse 6; `kangaroo56` 61 Videos; `olympiad713` null Videos, `kangaroo713` 90 Videos (37 für 7/8, 22 für 9/10, 31 für 11–13), `fit713` 107 Videos. Diese Zahlen sind der gelesene Stand vom 06.10.2026. Danach einmal ohne `--dry-run` ausführen und die öffentliche Datendatei sowie eine Karte in der App zurücklesen.
5. Als Hosting-Zeitauftrag stündlich zur Minute 10 einrichten. Diese Zeile ist nur eine Vorlage für die Serververwaltung, kein bereits angelegter Auftrag:

   ```text
   10 * * * * /PFAD/node /PRIVATE/sync-video-playlists.mjs --config=/PRIVATE/video-sources.json --output=/PFAD/fileadmin/grundschule-app-test/data/video-playlists.json
   ```

6. HTTPS-Quelle und Zielschreibrechte prüfen; Fehlermeldungen im Hosting überwachen. Abgebrochene Prozesse können die exklusive `.lock`-Datei hinterlassen. Erst nach Prüfung, dass kein Import mehr läuft, entfernt die Serverbetreuung diese Sperre. Unveränderte Inhalte werden nicht neu geschrieben; Fehler ersetzen keinen Bestand durch leere oder unvollständige Daten.

## Quellen und Grenzen

[Mathematik-Olympiade Klasse 5](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXNVpOQbZk54xwTMlJ_5dFxF), [Känguru Klasse 5/6](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXOqMfGFE4Cq7Hpt-wBdajw8). Der Olympiade-Klasse-6-Link wird einmal in der Konfiguration ergänzt, sobald er vorliegt. Playlistzugehörigkeit ist die Quelle der Klassenangabe. Die originalen YouTube-Titel bleiben als Quellen erhalten. In `presentation` der Konfiguration werden kurze Kartenüberschriften sowie geprüfte Aufgabenkennungen hinterlegt. Diese bleiben beim Abgleich erhalten. Neue Videos bekommen zunächst eine aus dem Quelltitel abgeleitete Überschrift; falls Jahr oder Aufgabenkennung fehlen oder der Quelltitel einen Fehler enthält, wird die Konfiguration einmal redaktionell ergänzt. Auch dafür wird kein App-Paket benötigt.

Für die Olympiade-Aufgaben der Klassen 5/6 werden die Videos beider Klassen zusammen nach dem bestätigten YouTube-Veröffentlichungszeitpunkt absteigend sortiert. Dafür liest der Import das Veröffentlichungsdatum aus der API oder für bislang undatierte Videos aus der öffentlichen Videoseite. Auch bei manueller Inhaltsaktualisierung gilt diese Reihenfolge. Fehlt ein verlässliches Datum, bleibt der zuletzt geprüfte Bestand erhalten.

Ein [offizieller YouTube-API-Aufruf](https://developers.google.com/youtube/v3/docs/playlistItems/list) liefert Seitenkennungen für die vollständige Abfrage. Private und gelöschte Videos werden nicht als öffentliche Karten übernommen. Für NI-Videos in Klasse 3/4 gilt die separate vollständige Knobelreise-/Arbeitsheftkette mit `arbeitsheft/sync-workbook.py`: öffentliche Videos, QR-Codes, geprüfte versionierte PDF und App-Verweis. Sie ersetzt den früheren JSON-Auftrag `sync-knobelreise.php`; beide werden nicht parallel eingerichtet. Der Playlistimport für Klasse 5/6 ersetzt diese Heftkette nicht. Ihr tatsächlicher öffentlicher Betriebsstand steht im Mac-Automationspaket.

Die automatische Pflege von Sonntagsrätsel-Aufgabenblättern, MathePlus-PDFs oder neuen AG-Inhalten ist damit noch nicht gelöst. Diese redaktionellen Daten benötigen ihren eigenen geprüften Import beziehungsweise ihre eigene Pflege. Der Import umfasst die Videoangebote für Klasse 5/6 und die beauftragten Playlists für Klasse 7–13. Mathe-Olympiade 7–13 bleibt bis zu einer belegten neuen Quelle leer. Die Konfiguration der Vorschau ist weiterhin getrennt vom veröffentlichten V0.11-Stand.

Quellen Klasse 7–13: [Känguru 7/8](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXM6HXs9xcsTx53PVfwGdt6v), [Känguru 9/10](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXNteuQs190-85xB8fHDQVvY), [Känguru 11–13](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXMdiqKaRw_dtYG9JGoFeYg4), [Terme und Gleichungen](https://www.youtube.com/playlist?list=PLc0Dd9HS2oXMrJCewNuSx5GSqBT-5Yjpg).
