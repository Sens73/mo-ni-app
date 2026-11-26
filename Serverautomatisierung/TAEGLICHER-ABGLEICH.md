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

## Auftragstext für den geplanten Lauf (Codex in der ChatGPT-App, täglich 7:30 und 17:30)

```
Täglicher Inhalts-Abgleich der MO-Ni-App. Andreas hat am 26.11.2026 freigegeben, dass bereits
öffentliche Inhalte automatisch in die veröffentlichte App übernommen werden.

1. Arbeitskopie aktualisieren (nur dieser Ordner, nie ~/Developer/mo-ni-app):
   Wenn ~/Developer/mo-ni-abgleich fehlt: git clone https://github.com/Sens73/mo-ni-app.git ~/Developer/mo-ni-abgleich
   Sonst: git -C ~/Developer/mo-ni-abgleich fetch origin main && git -C ~/Developer/mo-ni-abgleich reset --hard origin/main
2. Abgleich ausführen:
   NODE=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node
   PDFTOTEXT_BIN=~/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/poppler/bin/pdftotext
   $NODE ~/Developer/mo-ni-abgleich/scripts/inhalte-abgleichen.mjs --ausgabe=$HOME/MO-Ni-Abgleich/heute
3. Lies ~/MO-Ni-Abgleich/heute/bericht.txt.
   Steht dort „Nichts hochzuladen“ und gibt es keine Abschnitte „Nicht übernommen“ oder „Hinweise“:
   still beenden (DONT_NOTIFY).
4. Sonst lade über die angemeldete TYPO3-Oberfläche https://www.mo-ni.de/typo3/ (Modul Dateiliste)
   genau die Dateien aus bericht.txt in der angegebenen Reihenfolge in die angegebenen Ordner unter
   fileadmin/grundschule-app-test/ hoch und ersetze dabei die vorhandene Datei. Erlaubt sind nur
   Dateien unter data/, assets/vorschaubilder/ und MO65-Arbeitsheft-*.pdf. Nichts löschen, nichts
   anderes hochladen, keine Programmdateien.
5. Danach: $NODE ~/Developer/mo-ni-abgleich/scripts/inhalte-abgleichen.mjs --rueckpruefen=$HOME/MO-Ni-Abgleich/heute/bericht.json
   Bei „✓ Rückprüfung“: Andreas kurz melden, was neu in der App ist (Abschnitt „Neu in der App“).
   Bei „✗“: die betroffenen Dateien einmal erneut hochladen und erneut prüfen; scheitert es wieder,
   Andreas melden, welche Datei betroffen ist.
6. Abschnitte „Nicht übernommen“ oder „Hinweise“ Andreas einmal kurz melden (nicht jeden Tag wiederholen).
7. Ist TYPO3 nicht angemeldet: nichts hochladen, keine Zugangsdaten suchen, Andreas einmal bitten,
   sich unter https://www.mo-ni.de/typo3/ anzumelden. Der nächste Lauf holt alles nach.
```
