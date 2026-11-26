# MO-Ni-App

Web-App (PWA) „Mathe mit MO & Ni“ für Klasse 3 bis 13. Öffentlich unter
[mo-ni.de/app](https://www.mo-ni.de/fileadmin/grundschule-app-test/index.html).

## Woher dieser Stand kommt

Der erste Stand in diesem Repo ist **V0.14 Release 4** (veröffentlicht am 31.10.2026),
übernommen aus `Werkzeuge/MO-Ni-App/Versionen/v0.14-release-4` in Andreas' work-Ordner.

Nicht übernommen wurden sieben ältere Fassungen des MO65-Arbeitshefts
(`MO65-Arbeitsheft-<kennung>.pdf`, je etwa 25 MB), auf die der Code nicht mehr verweist.
Die verwendeten Fassungen `MO65-Arbeitsheft.pdf` und
`MO65-Arbeitsheft-33b39aeadce01a5c971c.pdf` sind enthalten.

Die Entwicklungsgeschichte bis hierher steht in `Werkzeuge/MO-Ni-App/Versionshistorie.md`.
Ab jetzt kommt jede Änderung als nachvollziehbarer Eintrag (Commit) in dieses Repo
statt als neue Ordnerkopie.

## Lokal starten und prüfen

```
npm start     # Entwicklungsserver auf http://localhost:4214
npm test      # alle automatischen Prüfungen
npm run test:browser   # App im Browser in iPhone- und Android-Größe öffnen (braucht Playwright)
```

Bei jedem Entwurf (Pull Request) laufen alle Tests automatisch auf GitHub
(`.github/workflows/pruefung.yml`). Ein grüner Haken heißt: alles besteht.
Dazu gehört eine Prüfung im echten Browser: Die App wird so ausgeliefert wie auf mo-ni.de,
jeder Bereich wird in iPhone- und Android-Größe geöffnet, das Offline-Paket gemessen und
ein Neustart im Flugmodus geprüft. Am Ende steht, welche fremden Adressen die App angefragt hat.

## Serverautomatisierung

Der Ordner `Serverautomatisierung/` enthält die Abgleich-Skripte, die auf dem Server
laufen (Knobelreise, Video-Playlists, Arbeitsheft mit QR-Codes). Er lag bisher neben
den Versionsordnern in `Werkzeuge/MO-Ni-App/Serverautomatisierung` und gehört jetzt
zum Repo, weil die Tests ihn brauchen. Zugangsdaten gehören nie hierher: Der
YouTube-Schlüssel kommt ausschließlich aus der Umgebungsvariablen `YOUTUBE_API_KEY`.

## Video-Vorschaubilder

Die Vorschaubilder der Videos liegen in `assets/vorschaubilder/` (eine Datei je Video,
480×270). So fragt die App beim Stöbern nicht bei Google an. Kommen neue Videos dazu, lädt
`bash scripts/update-vorschaubilder.sh` auf dem Mac nur die fehlenden Bilder. Bis dahin zeigt
die App einen MO-Ni-Platzhalter. Der Test `tests/vorschaubilder.test.mjs` meldet fehlende Bilder.

## Veröffentlichen

Bis auf Weiteres wie bisher: Dateien in TYPO3 nach `fileadmin/grundschule-app-test/`
hochladen. Jede Veröffentlichung braucht eine neue Release-Kennung (`RELEASE_CACHE`).
