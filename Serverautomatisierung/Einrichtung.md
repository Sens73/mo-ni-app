# Serverautomatisierung der Knobelreise und des Arbeitshefts

Stand: 04.10.2026. Die vollständige Kette ist im Ordner arbeitsheft umgesetzt: öffentlicher YouTube-Kanal → Knobelreise → QR-Codes und antippbare Videofelder → geprüfte neue PDF → versionierter App-Verweis. Der Code ist lokal geprüft; die dauerhafte Servereinrichtung ist noch offen.

Da Andreas ausschließlich TYPO3-Zugang besitzt, ist inzwischen eine Codex-Automation auf dem Mac für dienstags und donnerstags um 14:30 Uhr eingerichtet. Sie verwendet denselben Erzeuger und lädt nötige Änderungen über die vorhandene TYPO3-Anmeldung hoch. Der erste manuelle Abgleich ist erfolgreich und unverändert; ein tatsächlicher zeitgesteuerter Lauf mit neuem Video steht noch aus. Das ist kein aktivierter Serverauftrag.

Der bisherige Auftrag `sync-knobelreise.php` ergänzte ausschließlich `journey.json`. Er wird durch `arbeitsheft/sync-workbook.py` ersetzt. Beide dürfen nicht als getrennte laufende Pflege eingerichtet werden. Das ältere Skript bleibt als historische Quelle erhalten; es ist keine vollständige Heftautomatik.

Der neue Auftrag benötigt Python 3.10 oder neuer. Die beiden erforderlichen reinen Python-Bibliotheken und ihre Lizenzen sind im Paket enthalten; eine Installation von LaTeX, ein YouTube-Passwort und ein API-Schlüssel sind nicht nötig. Die Aufgaben und Lösungen stammen aus der zentral gebauten, geprüften MO65-Hauptquelle. Nur die 36 vorgesehenen Videofelder werden ergänzt.

Einrichtung, genaue Pfade und Rückprüfung. Die getrennte, unveröffentlichte Klasse-5/6-Vorschau und deren Playlistimport bleiben außerhalb dieses Auftrags.
