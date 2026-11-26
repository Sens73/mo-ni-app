# Teiler-Vielfache-Spiel · V0.14 Vorschau 11

19.10.2026. Erste lokale Umsetzung nach Andreas’ Auftrag. Vorschau 1 mit der bestätigten Spielansicht ist im bestehenden Prüfpaket gesichert. Vorschau 2 war die interne Erstprobe; Vorschau 3 verbessert die Lesbarkeit großer Kartenzahlen und verwendet neue vollständige Cachekennungen.

## Zahlenkarten-Symbol und getrennte Zielzahl-Probe · Vorschau 11

Das Auswahlsymbol zeigt auf Andreas’ Wunsch zwei Zahlenkarten mit Teilbarkeitsbeziehung: 6 und 12. SVG an das bestehende Symbolsystem angepasst, Ziffern in 32 × 32 px Originalgröße angesehen. Helle Kartenflächen halten die Ziffern von überlagerten Konturen frei. [Symbol](teiler-vielfache-2026-10-19/symbol-6-12-preview-11.jpg). Die vier betroffenen Testsuiten `content-updates`, `pwa`, `infrastructure` und `content` sowie die App-Syntaxprüfung bestanden. Vorschau 10 war die interne Symbolprobe.

Die Zielzahl-Idee wurde als getrennte interaktive Gesprächsprobe ausgearbeitet: zwei Karten und eine Rechenart wählen, Ergebnis selbst eingeben, erst bei korrekter Rechnung zu einer neuen Karte verbinden. Jede Ausgangskarte muss genau einmal eingehen. Drei Beispiele mit Plus/Minus beziehungsweise allen Grundrechenarten und ausschließlich ganzen Zwischenergebnissen ab 0. Alle drei Beispiele unabhängig auf Lösbarkeit geprüft. Browserprobe: falsches Ergebnis ohne Kartenverlust, zwei verschiedene Wege zu 24, Zwischenziel 24 bei noch übrigen Karten ohne vorzeitigen Sieg, doppelte Zwischenwerte, ganzzahlige/nicht ganzzahlige Division, Operandentausch, Rücknahme, Enter-Bedienung und Wiederherstellung nach Neuladen. Bei 320 px kein horizontaler Überlauf. Die Probe ist noch kein fünftes App-Spiel.

Bearbeitbare Gesprächsprobe: Zielzahl. Lokale App und bestehender iPhone-Test aktualisiert; keine Veröffentlichung.

## Spielauswahl · Vorschau 9

Auf Andreas’ Wunsch die Knöpfe Rätsel und Teiler & Vielfache getauscht. Reihenfolge: Rechen-Rallye, Zahlenwirbel, Teiler & Vielfache, Rätsel. Bei 390 × 844 beide Knöpfe bedient: Rätsel öffnet die Rätselübersicht; Teiler & Vielfache öffnet seine Einstellungen, gespeicherte Partie mit 150 Karten weiterhin fortsetzbar. Die vier betroffenen Testsuiten (`content-updates`, `pwa`, `infrastructure`, `content`) erfolgreich. [Spielauswahl](teiler-vielfache-2026-10-19/spielauswahl-preview-9.jpg). Lokal und im bestehenden iPhone-Test aktualisiert; keine Veröffentlichung.

## Mittige Ablage und mehrzeiliger Verlauf · Vorschau 8

Auf Andreas’ Wunsch liegt die Ablage jetzt mittig unter den Zahlenkarten. Der Spielverlauf folgt unmittelbar darunter und bricht in mehrere Zeilen um. Die zusätzliche Auswahl-/Legen-Leiste ist entfernt. Ziehen führt einen Zug aus; alternativ Zahl und danach Stapel antippen beziehungsweise per Tastatur betätigen. Der Vorrat bleibt eigenständig scrollbar. Lange Verläufe lassen die Seite nach unten wachsen, statt einzelne Züge waagerecht zu verstecken.

Beobachtet: Eine Karte auf den neuen Stapel gezogen, weitere zehn durch Zahl-/Stapel-Antippen gelegt; Folge 6 → 36 → 12 → 4 → 2 → 10 → 5 → 15 → 3 → 9 → 27 korrekt. Nach Neuladen vollständig erhalten. Bei 390 × 844 drei Verlaufszeilen; Stapel exakt mittig und beide Abstände 20 px. Bei 320 × 568 jeweils 16 px, bei 844 × 390 und 667 × 375 jeweils 12 px, bei 1280 × 720 jeweils 20 px. In allen fünf Ansichten kein horizontaler Seitenüberlauf, keine alte Auswahl-/Legen-Leiste. Ungültige 32 zu 27 verworfen; danach 1 über Enter auf Zahl und Stapel und 37 per Antippen gelegt: Sieg von A, alle 13 Züge im Ergebnis sichtbar. Karten 100 und 150 nach Scrollen/Seitenwechsel auf dem Stapel abgelegt, auch bei 320 × 568 erreichbar.

[Ansicht](teiler-vielfache-2026-10-19/ablage-mittig-390x844.jpg), [Abstände und Zeilenumbruch](teiler-vielfache-2026-10-19/ablage-layout-browser-preview-8.json), [94 technische Prüfungen](teiler-vielfache-2026-10-19/ablage-layout-tests-preview-8.json). Browserprobe am getrennten Prüfursprung `127.0.0.1:4216`; Maus und Tastatur geprüft, realer iPhone-Fingertest weiter offen. Bestehender lokaler iPhone-Zugang aktualisiert, keine Veröffentlichung.

## Ablagestapel und sichtbarer Verlauf · Vorschau 7

Andreas wünscht einen gemeinsamen Kartenstapel und die Zahlenfolge am unteren Rand. Die oberste Stapelkarte zeigt die letzte Zahl und den Spieler, der sie gelegt hat. Ziehen auf den Stapel führt denselben geprüften Zug aus wie „Karte legen“. Die Zahlenfolge bleibt als Reihe mit A/B und Spielerfarben sichtbar; bei langen Partien horizontal scrollbar. Nach einem neuen Zug ist das Reihenende sichtbar. Der Verlauf bleibt nach Neuladen, im PDF-Rückweg und bis zum Ergebnis erhalten. Auf dem Handy beginnt Ziehen am Punktgriff; Wischen über die Zahlenflächen scrollt weiterhin den Vorrat. Mit der Maus kann die ganze Karte aufgenommen werden. Antippen und Bestätigen sind weiterhin möglich. Keine Anzeige zulässiger Züge hinzugefügt. Vorschau 6 war die interne Bedienprobe.

Beobachtete Bedienprobe am lokalen Prüfursprung `localhost:4216`: 6 und 36 gezogen, 12 angetippt/bestätigt, 4 gezogen; Reihe korrekt als A6 → B36 → A12 → B4. Eine Partie bis 13 Züge und Sieg von A gespielt; vollständiger Verlauf im Ergebnis sichtbar. Neue Partie leert die Reihe. Eine Folge mit elf Zügen nach Neuladen vollständig wiederhergestellt, Reihenende automatisch sichtbar und Rückscrollen zum ersten Zug bedient. Karten 100 und 150 nach Scrollen beziehungsweise Seitenwechsel auf den Stapel gezogen. Ungültige 149 zu 150 ohne Karten-/Spielerwechsel zurückgewiesen. Neun aktuelle Ansichten für 40/100/150 Karten bei 320 × 568, 844 × 390 und 667 × 375: Legen-Leiste und Verlaufsreihe im sichtbaren Bereich, keine horizontale Seitenüberbreite, Kartenhöhe mindestens 44 px. Auch Fehlermeldung und Verlauf passen bei 320 × 568 zusammen. In 390 × 844 passen alle 40 Karten, Stapel, Legen-Leiste und Verlauf gleichzeitig.

[Spielansicht](teiler-vielfache-2026-10-19/stapel-verlauf-390x844.jpg), [neun Größenprüfungen](teiler-vielfache-2026-10-19/stapel-verlauf-browser-preview-7.json), [94/94 technische Prüfungen](teiler-vielfache-2026-10-19/stapel-verlauf-tests-preview-7.json). Die Controllerprüfung umfasst gültige, ungültige, verbrauchte und außerhalb abgelegte Karten, Pointer-Abbruch/Sichtbarkeitswechsel, Touch-Griff gegenüber normaler Scrollfläche, schnelle Folgeaktionen und die Tastaturalternative. Die Browserprobe verwendet echte Mausgesten; Finger-/Stiftbedienung auf einem realen iPhone oder Tablet bleibt zu erproben. Bestehender lokaler iPhone-Zugang auf demselben Mac aktualisiert; keine Veröffentlichung.

## Korrektur des Karten-Rückwegs · Vorschau 5

Andreas meldete, dass „Spielkarten zum Ausdrucken“ als separates PDF ohne Rückweg endet. Beide Kartensätze öffnen nun über den vorhandenen PDF-Betrachter der App. „Zurück zum Spiel“ bleibt beim Scrollen sichtbar; Drucken und Herunterladen bleiben verfügbar. Die Kopfzeile scrollt in dieser Kartenansicht mit, damit sie den Rückknopf nicht überdeckt. Beim Zurückkehren bleibt der Materialbereich geöffnet; Fokus und Scrollposition kehren zum zuvor verwendeten Knopf zurück. Vorschau 4 war die interne PDF-Probe.

Beobachtet in Vorschau 5: Vorder- und Rückseiten mit jeweils 43 vollständig geladenen Seiten; Drucken jeweils bereit. Vorderseiten bei 390 × 844 gescrollt: Rückknopf bei y=8 weiterhin sichtbar. Beide Rückwege führen zur Spieleinstellung mit geöffnetem Materialbereich. Danach Partie fortgesetzt: Karten 6 und 36 weiterhin verbraucht, Spieler A am Zug, Auswahl 12 erhalten. Rückseiten und Rückkehr zusätzlich bei 320 × 568 ohne horizontalen Überlauf bedient. Das bisher separat geöffnete Kartenfenster auf localhost wurde auf die korrigierte App-Ansicht umgestellt. Kein Druckauftrag ausgelöst und kein tatsächlicher iPhone-Touch-Test in diesem Korrekturlauf.

[Ansicht mit Rückweg](teiler-vielfache-2026-10-19/pdf-rueckweg-390x844.jpg). [94/94 technische Prüfungen](teiler-vielfache-2026-10-19/pdf-return-tests-preview-5.json), einschließlich tatsächlicher App-Ereignisse für beide PDF-Ziele, Rückkehr mit erhaltenen Einstellungen/Spielzügen und erneut geöffnetem Materialbereich. Lokale Vorschau und bestehender iPhone-Test auf demselben Mac laufen mit Vorschau 5; keine Veröffentlichung.

## Vereinbarter Umfang

- Zwei Personen an einem Gerät. Die Zahlen 1 bis N liegen offen und werden genau einmal verwendet.
- Ausschließlich 40 und 100 als feste Kartenzahlen; eigene ganze Zahl größer als 100. Keine Wahl 20, 60 oder 80.
- Erster Zug gerade. Jeder folgende Zug ein Teiler oder Vielfaches der letzten Karte. Wer keinen Zug mehr hat, verliert.
- Keine Hilfe, kein Hinweis auf erlaubte Züge und keine automatische Hervorhebung passender Karten. Verbrauchte Karten gesperrt, die übrigen unabhängig von ihrer Zulässigkeit gleich dargestellt. Nur die selbst ausgewählte Karte wird markiert.
- Ziehen auf den Stapel oder Zahl und anschließend Stapel antippen. Keine zusätzliche Auswahl-/Legen-Leiste. Ungültige Versuche erhalten einen kurzen Grund, verändern aber weder die Partie noch den Spielerzug.
- Klare Anzeige für Spieler A/B und letzte Karte; unabhängiger Kartenscrollbereich, Legen-Knopf stets erreichbar. Dauerhaft sichtbare Zahlenfolge, lokale Speicherung und Fortsetzen. Bei der unmittelbaren Folgepartie wechselt der Startspieler.
- Originalkartensatz als zwei unveränderte PDFs für das Spielen am Tisch zugänglich. Kein Computergegner und kein zusätzlicher Spielmodus in dieser ersten Fassung.

## Beobachtete Prüfung

| Kriterium | Beobachtetes Ergebnis | Beleg |
|---|---|---|
| Eingaben und Regeln | 40/100 akzeptiert; eigene Zahlen ab 101. Eigene Eingaben 100 und 100,5 verworfen. Ungerader Beginn und unpassende Zahl ohne Zugverlust | [Technische Prüfungen](teiler-vielfache-2026-10-19/technische-pruefungen.json), [Browserprobe](teiler-vielfache-2026-10-19/browserpruefung.json) |
| Nutzerbeispiel | 6 → 36 mit korrektem Spielerwechsel. Anschließend 7 abgelehnt; beide benutzten Karten und Spieler A erhalten | Browserprobe |
| Speicherung | 6 → 36 und die noch nicht gelegte Auswahl 7 nach Neuladen vollständig wiederhergestellt. Eigener Speicherschlüssel `moni-public-v1-divisor-game`; andere Spielstände nicht ersetzt | Browserprobe und Controller-Test |
| Vollständige Partie | 38 → 19 → 1 → 37: Spieler B gewinnt. Die 1 beendet die Partie nicht voreilig. Verlauf mit korrekten A/B-Zuordnungen; Folgepartie beginnt mit B | Browserprobe |
| Große Kartenzahl | 10.000 Karten gestartet, zur Zahl 10.000 gesprungen und diese gelegt. Nur 100 Karten im DOM. Zahlen ohne trennende Zeilenumbrüche bei den üblichen Größen; für sehr lange Zahlen weniger Spalten | Browserprobe |
| Seiten und Spielende | Bei 101 Karten zweite Seite mit genau einer Karte. 101 nach 6 abgelehnt; 6 → 1 → 101 endet korrekt mit Sieg A | Browserprobe |
| Kleine Bildschirme | 40, 100 und 101 Karten jeweils bei 320 × 568, 390 × 844, 844 × 390 und 1280 × 720: kein horizontaler Überlauf. Legen-Leiste innerhalb des sichtbaren Bereichs, Karten mindestens 44 px hoch | Zwölf Messungen in Browserprobe |
| Bestehende Spiele | Rechen-Rallye: Aktionsleiste bis y=497,1; Zahlenregen bis y=541 bei 320 × 568. Polyomino 5: Werkzeuge unverändert bis y=547,5. Kein horizontaler Überlauf, kompakte Spielwahl beziehungsweise ausgeblendete Spielwahl erhalten | Browserprobe |
| Vollständige technische Prüfung | 94/94 Kommandos erfolgreich: 67 Syntaxprüfungen und 27 Testsuiten | Technische Prüfungen |
| Unabhängige mathematische Kontrolle | 25.481 vollständige beziehungsweise zufällige Stellungen gegen eine getrennte Suche über alle verfügbaren Zahlen verglichen. Zusätzlich Primzahlprüfung gegen unabhängige Probedivision, bekannte zusammengesetzte Pseudoprimzahlen und große Ganzzahlen getestet | `tests/divisor-game.test.mjs` und technische Ergebnisse |
| Quellen erhalten | Alle 76 bisher vorhandenen Daten-, Bild- und PDF-Dateien bytegleich mit dem veröffentlichten Ausgangsstand. Modelle und Speicherung der bisherigen Spiele unverändert, abgesehen von Versionsverweisen | [SHA-Abgleich](teiler-vielfache-2026-10-19/inhaltsabgleich.json) |
| Lokaler iPhone-Zugang | Netzwerkadresse 192.168.2.190:4216 meldet V0.14.0 / Vorschau 3. Spielmodul und Originalkarten bytegleich zurückgelesen. Kartenmotiv mit korrektem SVG-MIME-Typ ausgeliefert | Lokale HTTP-Rückprüfung am 19.10.2026 |

[Bild der Spielansicht](teiler-vielfache-2026-10-19/spiel-40-390x844.jpg), [kleines Handy](teiler-vielfache-2026-10-19/spiel-40-320x568.jpg), [Querformat](teiler-vielfache-2026-10-19/spiel-40-844x390.jpg).

## Umsetzung und Grenzen

Das Spiel erzeugt für große N höchstens 100 Karten je Seite und bietet eine Zahlensuche als Navigation. Die eingegebene Kartenzahl besitzt keine zusätzliche spielbezogene Obergrenze; die aktuelle JavaScript-Darstellung nimmt exakt repräsentierbare ganze Zahlen bis `Number.MAX_SAFE_INTEGER` an. Es wird kein Array der Länge N angelegt.

Die Endkontrolle zählt freie Vielfache zunächst über die bereits verbrauchten Zahlen. Sind auch die 1 und alle Vielfachen verbraucht, wird geprüft, ob noch ein echter Teiler frei ist. Bei zusammengesetzten Zahlen genügt entweder ein noch nicht verbrauchter Primfaktor oder die vollständige, aus verbrauchten Primteilern bekannte Teileranzahl. So ist auch bei großen Zahlen keine Suche durch den gesamten Kartenbereich nötig. Die dabei verwendete Primzahlprüfung rechnet modular mit BigInt. Diese internen Prüfungen werden nicht als Tipps ausgegeben.

Die ersten Spielproben in Vorschau 3 verwenden ausschließlich den getrennten Prüfursprung `127.0.0.1:4214`. Sie sind kein tatsächlicher iPhone-Touch-Test. Der bestehende lokale iPhone-Zugang bleibt über denselben Mac verfügbar. [QR-Code für das neue Spiel](teiler-vielfache-2026-10-19/iphone-test.png). Kein Upload; öffentlicher Stand bleibt V0.13 Release 1. Statistik bleibt ausgeschaltet. Die gestalterische Bestätigung der bisherigen Spielansicht gilt unverändert; die Abnahme des neuen Spiels steht aus.
