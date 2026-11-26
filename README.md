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
```

Bekannter Stand beim Import: 4 Testdateien scheitern, weil sie den aktuellen
Datenbestand statt fester Beispiele prüfen (audience, content, material-presentation,
journey-filters). `tests/kenken.test.mjs` fehlt noch in `npm test`.

## Veröffentlichen

Bis auf Weiteres wie bisher: Dateien in TYPO3 nach `fileadmin/grundschule-app-test/`
hochladen. Jede Veröffentlichung braucht eine neue Release-Kennung (`RELEASE_CACHE`).
