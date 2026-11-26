# Spielansicht · V0.14 Vorschau 1

**19.10.2026 · lokal geprüft; nicht veröffentlicht.** Ausgangsstand: `v0.13-veroeffentlicht`, V0.13 Release 1. Umsetzung nach Andreas’ Auftrag zu Imkes Rückmeldung vom 19.10.

## Ergebnis

Klassenwahl im gesamten Spielbereich entfernt. Während einer Aufgabe oder Kurzspielrunde verschwinden die große App-Kopfzeile und das Dock. Rückwege bleiben direkt erreichbar: Rätsel-Auswahl und Startseite beim Rätsel; kompakte Spielwahl und Startseite bei den Kurzspielen. Auswahl- und Einstellungsseiten behalten die normale Navigation. Der gewählte Klassenbereich bleibt gespeichert.

Polyomino-Bretter werden auch anhand der Bildschirmhöhe begrenzt. Im Hochformat stehen sämtliche Teile in einer kompakten Reihe und die drei Werkzeuge direkt darunter. Im kurzen Querformat stehen die Werkzeuge neben dem Brett. Figuren, Brettgeometrie, farbige Teile und Konturen bleiben proportional.

## Unabhängige Prüfung

| Kriterium | Beobachtetes Ergebnis | Beleg |
|---|---|---|
| Ganze Polyomino-Arbeitsfläche ohne ständiges Scrollen | Alle fünf Aufgaben bei 320 × 568, 390 × 844, 844 × 390, 667 × 375 und 1280 × 720: Brett, Teile und Werkzeuge jeweils vollständig im sichtbaren Bereich; kein horizontaler Überlauf | [25 Größenmessungen](spielansicht-2026-10-19/layoutmessungen.json) |
| Nachvollziehbarer Vorher-Nachher-Vergleich | Polyomino 5 bei 320 × 568: bisher Werkzeuge bis y=881,99; jetzt bis y=547,48. Zellen jetzt rund 50,3 px breit. Alle benötigten Elemente gleichzeitig sichtbar | Bisherigen V0.13-Quellstand über getrennten lokalen Server geöffnet; [neue Ansicht](spielansicht-2026-10-19/polyomino-5-320x568.jpg) |
| Responsive Anordnung | Hochformat: Brett oben, Teile und Werkzeuge direkt darunter. Querformat: Werkzeuge daneben. Sichtprüfung der tatsächlichen Screenshots | [390 × 844](spielansicht-2026-10-19/polyomino-5-390x844.jpg), [844 × 390](spielansicht-2026-10-19/polyomino-5-844x390.jpg) |
| Polyomino-Bedienung | Teil gewählt, gedreht, gespiegelt, platziert, entfernt und erneut platziert. Belegte Felder: acht, nach Entfernen vier, danach wieder acht | Browserprobe Polyomino 1, getrennter Prüfstand |
| Speicherung und PDF-Rückweg | Acht belegte Felder nach Neuladen sowie nach Aufgabenblatt öffnen und „Zurück zum Rätsel“ erhalten; PDF vollständig als eine Seite geladen | Browserprobe Polyomino 1 |
| Vollständiger Abschluss | Polyomino 1 korrekt gelegt, fertiges Brett angezeigt, Feier und einmalige Vergabe von zehn Goldtalern bestätigt | Getrennter Prüfstand `127.0.0.1:4214` |
| Andere Spiele und Rückwege | Rechen-Rallye und Zahlenregen gestartet, Pause und Fortsetzen geprüft. Direkter Start-Rückweg funktioniert; Klasse 7–13 bleibt bei Rückkehr ausgewählt. Sumdoku, Zahlenpfad, Zahlenkreuz und Differenzpyramide ohne Überlauf; Rückwege erreichbar | Browserproben bei 320 × 568 |
| Technische Prüfungen | 91/91 erfolgreich: 65 Syntaxprüfungen und 26 Testsuiten | [Vollständige Ergebnisse](spielansicht-2026-10-19/technische-pruefungen.json) |
| Quellen und Spiellogik erhalten | Alle 76 Inhalts-, PDF- und Bilddateien bytegleich zur veröffentlichten Ausgangsfassung. Rätselmodelle, Aufgaben und Fortschrittsspeicherung unverändert, abgesehen von Versionsverweisen | [SHA-256-Abgleich](spielansicht-2026-10-19/inhaltsabgleich.json) |

Die Tests wurden aus der bisherigen Entwicklung übernommen und auf Versionskennung/App-ID der neuen Vorschau sowie die Speicherkennung des veröffentlichten Ausgangsstands angepasst. Der Test für eine ausschließlich lokal vorab freigegebene Folge #05 verwendet jetzt eine ausdrückliche Vor-Veröffentlichungs-Fixture, weil der Ausgangsstand das bereits veröffentlichte fünfte Blatt enthält. Aufgaben-, Video- und Freigabelogik wurden dabei nicht verändert.

## Status und Grenzen

Die Vorschau läuft lokal auf Port 4214; automatischer Inhaltsabgleich während der Prüfung ausgeschaltet. Tests mit simulierten Browsergrößen sind keine Prüfung auf echten Touch-Geräten. Nutzerabnahme und reale Handyprobe stehen aus. Die öffentliche App bleibt V0.13 Release 1; kein Upload. Statistik bleibt unverändert ausgeschaltet. Die bisherigen V0.13-Quellen und der tatsächliche Nutzerspielstand wurden nicht verändert; alle Proberunden liefen im getrennten Ursprung.

Start über Start-Version-0.14-Vorschau.command.

## Lokale iPhone-Bereitstellung · 19.10.2026

Auf ausdrücklichen Auftrag im lokalen Netzwerk gestartet, Port 4216, Mac-Adresse 192.168.2.190. Der Testdienst meldet V0.14.0 / v0.14.0-preview-1. Über die Netzwerkadresse gelieferte App-Datei bytegleich mit dem neuen Quellstand; Browser zeigt V0.14 und alle fünf Rätseltypen. QR-Code lokal erzeugt. Automatischer Inhaltsabgleich ausgeschaltet, Mac während des laufenden Tests gegen automatischen Ruhezustand geschützt. Kein Upload. Die Bedienprobe auf dem tatsächlichen iPhone kann erst Andreas bestätigen.

## Gestalterische Bestätigung · 19.10.2026

Andreas hat die neue Spielansicht nach Bereitstellung des lokalen iPhone-Tests positiv bestätigt („Gefällt mir sehr gut.“). Gestaltung damit bestätigt. Die Rückmeldung belegt keine vollständige Prüfung aller Bedienwege auf dem iPhone und enthält keine Veröffentlichungsfreigabe.
