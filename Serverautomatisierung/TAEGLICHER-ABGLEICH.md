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

## Einrichtung auf dem Mac

Codex (in der ChatGPT-App) darf GitHub nicht erreichen und nur im Ordner work schreiben. Deshalb liegt
eine Kopie der nötigen Programmteile im Ordner work:

- `work/Werkzeuge/MO-Ni-App-Abgleich/programm/` – Kopie aus diesem Repo (`git archive` von main mit
  scripts, Serverautomatisierung, data, audience.js, package.json); Stand in `STAND.txt`.
  **Nach Änderungen an diesen Teilen erneuert Claude die Kopie** (über die Mac-Sitzung).
- `work/Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh` – ruft den Abgleich mit dem Node von Codex auf
  (`~/.cache/codex-runtimes/…/node`, pdftotext ebenso), Zwischendateien in `.lokal.nosync/tmp`.
  `abgleich.sh --rueckpruefen` prüft danach mo-ni.de.
- `work/Werkzeuge/MO-Ni-App-Abgleich/heute/` – Ergebnis des letzten Laufs mit `bericht.txt`.

## Auftragstext der Codex-Automation „MO-Ni-App: täglicher Abgleich“ (täglich 17:30)

```
Täglicher Inhalts-Abgleich der MO-Ni-App (Freigabe Andreas 26.11.2026: bereits öffentliche Inhalte automatisch übernehmen).
1. Führe aus: bash "Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh"
2. Lies Werkzeuge/MO-Ni-App-Abgleich/heute/bericht.txt. Steht dort „Nichts hochzuladen“ und gibt es keine Abschnitte „Nicht übernommen“ oder „Hinweise“: still beenden (DONT_NOTIFY).
3. Sonst lade über die angemeldete TYPO3-Oberfläche https://www.mo-ni.de/typo3/ (Dateiliste) genau die Dateien aus Werkzeuge/MO-Ni-App-Abgleich/heute/ in der Reihenfolge aus bericht.txt in die dort genannten Ordner unter fileadmin/grundschule-app-test/ hoch und ersetze die vorhandene Datei. Erlaubt sind nur Dateien unter data/, assets/vorschaubilder/ und MO65-Arbeitsheft-*.pdf. Nichts löschen, nichts anderes hochladen. Für den Browser dasselbe Werkzeug wie bisher verwenden (cua_repl mit dem ChatGPT-In-App-Browser).
4. Danach: bash "Werkzeuge/MO-Ni-App-Abgleich/abgleich.sh" --rueckpruefen. Bei „✓“ Andreas kurz melden, was neu ist. Bei „✗“ einmal erneut hochladen und prüfen; scheitert es wieder, Andreas die betroffene Datei melden.
5. „Nicht übernommen“ oder „Hinweise“ Andreas einmal kurz melden.
6. Ist TYPO3 nicht angemeldet: nichts hochladen, keine Zugangsdaten suchen, Andreas einmal bitten, sich anzumelden.
```
