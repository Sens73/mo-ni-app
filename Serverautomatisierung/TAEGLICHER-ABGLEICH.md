# Täglicher Inhalts-Abgleich (seit 26.11.2026)

Ersetzt die beiden Codex-Automationen „Knobelreise und Arbeitsheft aktualisieren“ (Di/Do) und
„Sonntagsrätsel: App zum Communitybeitrag bereitstellen“ (Sa). Das Sonntagsrätsel ist eingestellt,
die Knobelreise hat keine festen Termine mehr; neue Inhalte entstehen unregelmäßig.

## Ablauf

1. `scripts/inhalte-abgleichen.mjs` holt den veröffentlichten Stand von mo-ni.de, sucht auf den
   öffentlichen Seiten und bei YouTube nach Neuem und ergänzt **nur neue, vollständige Einträge**.
   Bestehende Einträge (gepflegte Untertitel, Klassenangaben, korrigierte PDF-Fassungen) bleiben
   unverändert. Unvollständige neue Einträge werden zurückgehalten und im Bericht genannt.
2. Ergebnis: Ordner `~/MO-Ni-Abgleich/heute` mit den geänderten Dateien und `bericht.txt`
   (Hochlade-Reihenfolge und Zielordner).
3. Der geplante Auftrag lädt genau diese Dateien über die angemeldete TYPO3-Oberfläche hoch.
4. `--rueckpruefen` vergleicht danach, ob mo-ni.de genau diese Fassungen ausliefert.
5. Unabhängig davon prüft der GitHub-Wächter (`.github/workflows/waechter.yml`) jeden Abend,
   ob in der App etwas Öffentliches fehlt, und schickt sonst eine E-Mail.

Freigabe (Andreas, 26.11.2026): Inhalte, die schon öffentlich sind, dürfen automatisch hochgeladen
werden. Programmdateien (`.js`, `.css`, `.html`, Service Worker) nie automatisch.

## Einrichtung auf dem Mac (ohne Codex, Stand 27.11.2026)

Andreas' Vorgabe: Alles läuft ohne Codex/OpenAI. Der Abgleich ist eine **geplante Aufgabe in Claude Code
Desktop** (Code-Tab › Scheduled › New task, „Only on this computer“, Ordner work, täglich 17:30).
Sie sucht nach Neuem und lädt mit Claude in Chrome nach TYPO3 hoch (Skill „dateien-hochladen“).

Voraussetzungen: Claude-App offen, Mac wach (verpasste Läufe holt die App beim Aufwachen nach),
Chrome mit der Claude-Erweiterung und angemeldetem TYPO3, Node.js (einmal von nodejs.org installiert).
`pdftotext` ersetzt `scripts/pdftotext.py` (mitgeliefertes pypdf), kein Homebrew nötig.

Dateien im Ordner work:

- `Werkzeuge/MO-Ni-App-Abgleich/programm/` – Kopie aus diesem Repo (`git archive` von main mit
  scripts, Serverautomatisierung, data, audience.js, package.json); Stand in `STAND.txt`.
  **Nach Änderungen an diesen Teilen erneuert Claude die Kopie.**
- `Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh` – Kopie von `Serverautomatisierung/mac/abgleich.sh`.
  `abgleich.sh --rueckpruefen` prüft danach mo-ni.de.
- `Werkzeuge/MO-Ni-App-Abgleich/heute/` – Ergebnis des letzten Laufs mit `bericht.txt`.

## Auftragstext der geplanten Aufgabe „MO-Ni-App: täglicher Abgleich“

```
Täglicher Inhalts-Abgleich der MO-Ni-App. Andreas hat am 26.11.2026 freigegeben, dass bereits öffentliche Inhalte automatisch in die veröffentlichte App übernommen werden; Programmdateien nie.
1. Führe aus: bash "Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh"
2. Lies Werkzeuge/MO-Ni-App-Abgleich/heute/bericht.txt. Steht dort „Nichts hochzuladen“ und gibt es keine Abschnitte „Nicht übernommen“ oder „Hinweise“: ohne Meldung beenden.
3. Sonst lade nach dem Skill „dateien-hochladen“ mit Claude in Chrome über https://www.mo-ni.de/typo3/ (Dateiliste) genau die Dateien aus Werkzeuge/MO-Ni-App-Abgleich/heute/ in der Reihenfolge aus bericht.txt in die dort genannten Ordner unter fileadmin/grundschule-app-test/ hoch und ersetze jeweils die vorhandene Datei. Erlaubt sind nur Dateien unter data/, assets/vorschaubilder/ und MO65-Arbeitsheft-*.pdf. Nichts löschen, nichts anderes hochladen.
4. Danach: bash "Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh" --rueckpruefen. Bei „✓“ kurz melden, was neu in der App ist. Bei „✗“ die betroffenen Dateien einmal erneut hochladen und erneut prüfen; scheitert es wieder, melden, welche Datei betroffen ist.
5. Abschnitte „Nicht übernommen“ oder „Hinweise“ kurz melden.
6. Ist TYPO3 in Chrome nicht angemeldet oder Chrome nicht erreichbar: nichts hochladen, keine Zugangsdaten eingeben oder suchen, melden, dass Andreas sich anmelden soll. Der nächste Lauf holt alles nach.
7. Läuft der Auftrag verspätet (z. B. nach dem Aufwachen des Macs), genauso vorgehen.
```
