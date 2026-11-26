# Automatische Knobelreise und MO65-Arbeitsheft

Stand: 04.10.2026. **Umgesetzt und lokal geprüft; Serverauftrag noch nicht aktiviert.**

Sobald ein Video mit einer der 36 MO65-Aufgabenkennungen im öffentlichen MO-Ni-YouTube-Kanal erscheint, übernimmt der nächste Lauf das Video in die Knobelreise. Er setzt an der exakt zugehörigen Stelle einen blauen QR-Code und eine einzige antippbare Linkfläche über das ganze Videofeld. Anschließend erzeugt und prüft er das gemeinsame 57-seitige Arbeitsheft und ersetzt den PDF-Verweis in den App-Daten. Die installierte App übernimmt diesen Verweis durch ihre vorhandene Inhaltsaktualisierung; beim nächsten Öffnen lädt der Leser die neue PDF. Heruntergeladene und gedruckte Exemplare bleiben auf ihrem bisherigen Stand.

## Einmalige Einrichtung auf dem Webserver

1. Den gesamten Ordner `arbeitsheft`, einschließlich `templates` und `vendor`, **außerhalb des öffentlich erreichbaren Webverzeichnisses** ablegen, beispielsweise unter `/srv/mo-ni-automation/arbeitsheft`.
2. Python 3.10 oder neuer bereitstellen. `vendor` enthält pypdf 6.10.0 und Segno 1.6.6 mit ihren Lizenzen; pip und LaTeX werden im Betrieb nicht benötigt. Ausgehende HTTPS-Abfragen an `www.youtube.com` müssen möglich sein.
3. Der ausführende Benutzer benötigt Leserechte für die Vorlagen sowie Lese-/Schreibrechte im App-Ordner und für **`data/journey.json` und `data/content.json`**. Der `--app-root`-Pfad bezeichnet den Ordner mit `index.html`, nicht dessen `data`-Unterordner. Die veröffentlichten Dateien liegen unter `fileadmin/grundschule-app-test/`.
4. Mit angepasstem absoluten Serverpfad zunächst lesen und prüfen:

   ```sh
   /usr/bin/python3 /srv/mo-ni-automation/arbeitsheft/sync-workbook.py --app-root=/ABSOLUTER/PFAD/fileadmin/grundschule-app-test --dry-run
   ```

   Erwartet werden derzeit neun öffentliche Reisevideos und neun Arbeitsheft-Videolinks. Der Trockenlauf verändert keine App-Dateien.
5. Denselben Aufruf ohne `--dry-run` ausführen. Danach `data/content.json` und den darin genannten PDF-Link über die öffentliche Adresse zurücklesen; `workbooks.sha256` muss mit der heruntergeladenen PDF übereinstimmen. Heftseite 18 muss das Video `KjZWuChp88A` öffnen.
6. Im Hostingpanel einen regelmäßigen Auftrag **alle 15 Minuten** einrichten. Beispiel für eine klassische Server-Zeittabelle:

   ```text
   */15 * * * * /usr/bin/python3 /srv/mo-ni-automation/arbeitsheft/sync-workbook.py --app-root=/ABSOLUTER/PFAD/fileadmin/grundschule-app-test >> /srv/mo-ni-automation/arbeitsheft/lauf.log 2>&1
   ```

   Bei einem Hostingpanel mit Auswahlfeldern: alle Tage, alle Stunden, alle 15 Minuten. Eine Zeitzonenanpassung ist für das Abfrageintervall nicht nötig. Die nächste Videoankündigung berücksichtigt weiterhin `Europe/Berlin`, die tatsächliche Aufgabenfolge, Mathe-AG-Wochen und hinterlegte Ferien.
7. Einen gegebenenfalls vorhandenen alten Auftrag für `sync-knobelreise.php` ersetzen. Einen weiteren automatischen Lauf abwarten und im Protokoll sowie in der öffentlich zurückgelesenen App kontrollieren. **Erst danach gilt die Serverautomatik als aktiviert.**

## Verhalten und Schutz vor unvollständigen Updates

- Der öffentliche RSS-Kanal erfordert keine YouTube-Anmeldung. Private oder nur geplante Videos werden nicht übernommen. Andere Formate und Kennungen außerhalb der MO65-Aufgabenfolge werden nicht als Heftvideo eingetragen.
- Bereits bestätigte Videos bleiben erhalten, auch wenn sie aus dem kurzen RSS-Ausschnitt verschwinden. Ein sehr lange unterbrochener Betrieb kann einen einmaligen vollständigen Bestandsabgleich benötigen.
- Mehrdeutige Kennungen, fehlerhafte Antworten, geänderte Vorlagen oder eine gescheiterte PDF-Prüfung brechen den Lauf ab. Der bisher gültige Heftverweis bleibt erhalten.
- Die geprüfte Vorlage enthält Aufgaben, Lösungen, Figuren, Lesezeichen und interne Seitenverweise. Der Server erzeugt ausschließlich die vorgesehenen Videofelder als Vektorgrafik. Alle 36 Positionen stammen aus der aktuellen Heftquelle und wurden aus dem zentralen Bau geprüft.
- Eine neue PDF erhält einen eigenen Dateinamen aus Vorlage, Videolinks und Erzeugungscode. Sie wird zuerst vollständig erzeugt und zurückgelesen; erst anschließend werden die Videoliste und der PDF-Verweis atomar ersetzt. Alte PDF-Ausgaben bleiben für bereits geöffnete Ansichten erhalten. Ein Abbruch zwischen den beiden Datenaktualisierungen wird beim nächsten Lauf nachgetragen.
- Unveränderte Videos und Vorlagen erzeugen keine neue PDF und kein neues Inhaltsdatum. Parallele Läufe werden durch dieselbe Dateisperre wie beim bisherigen PHP-Auftrag verhindert.
- Die übrigen App-Bereiche werden beim Schreiben von `content.json` erhalten. MathePlus, Sonntagsrätsel-PDFs und andere redaktionelle Materialien sind nicht Gegenstand dieser Knobelreise-Heftautomatik.
- Nach Abschluss aller 36 Aufgaben wird keine erfundene nächste Kennung angekündigt. Ein anderes Jahresheft benötigt seine eigene geprüfte Vorlage und Zuordnung.

## Lokaler Quellenabgleich und neue Vorlagen

Die normale TeX-Hauptquelle liest ihre einzige Videolinkliste aus `MO65-Videolinks-automatisch.tex`. Für einen lokalen vollständigen Abgleich zusätzlich `--source-tex=/ABSOLUTER/PFAD/MO65-Videolinks-automatisch.tex` angeben. Die Server-PDF und weitere lokale TeX-Bauten verwenden damit dieselben Aufgabenkennungen und Ziele.

Bei einer beauftragten Änderung von Aufgaben, Lösungen oder Seitenpositionen zuerst die aktuelle Hauptquelle bearbeiten. `MO65-Automatikvorlage.tex` mit dem zentralen Mathematik-Bauwerkzeug bauen und danach mit `prepare-template.py` die Vorlage und Positionsliste exportieren. Der Export entfernt sämtliche unsichtbaren Positionsmarken; sie gelangen nicht in die veröffentlichte PDF. Die neue Vorlage vollständig prüfen und als neues Serverpaket bereitstellen. Der Server benötigt dafür keine eigenen TeX-Quellen.

## Tatsächliche Prüfungen vom 04.10.2026

- Vollständiger Lauf mit dem aktuell öffentlich gelesenen YouTube-Feed: neun Videos, einschließlich NI650323.
- Neun automatisierte Ablaufprüfungen: neue Veröffentlichung, unveränderte Wiederholung, Erhalt anderer App-Inhalte, Zukunftsdatum, falscher Kanal, doppelte Kennung, fehlerhafte Quelle, PDF-Schreibfehler, Trockenlauf sowie AG/Ferien/Winterzeit und vollständige Aufgabenfolge.
- Alle 57 Seiten gerendert und pixelweise mit der vorherigen Ausgabe verglichen: außerhalb der 36 Videofelder keine Unterschiede.
- Alle 36 Videopositionen im Vollausstattungs-Test bei 300 dpi gerendert und QR-Codes ausgelesen: alle Ziele korrekt. Nur neun Ziele sind tatsächlich veröffentlichte Videos; weitere Testziele bleiben ausschließlich in den lokalen Prüfdateien und werden nicht bereitgestellt.
- App-Leser lokal und öffentlich: 57 Seiten, neue gemeinsame Linkfläche zu NI650323 auf Seite 18. Das Linkziel öffnet laut `target="_blank"` getrennt; ein tatsächlich entstandenes neues Videofenster wurde in dieser Browserprüfung nicht bestätigt.

Die dokumentierten Bibliotheksfunktionen: [Segno](https://segno.readthedocs.io/en/latest/api.html), [pypdf](https://pypdf.readthedocs.io/en/stable/modules/PdfWriter.html).
