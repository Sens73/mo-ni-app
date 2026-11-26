# Nativer Systemdruck

Die Web-App ruft in einer späteren Capacitor-Hülle automatisch `Capacitor.Plugins.MONiPrint.printPdf(...)` auf. Die beiden Quelltexte in diesem Ordner implementieren diesen Vertrag:

- iOS über `UIPrintInteractionController`,
- Android über `PrintManager` und einen `PrintDocumentAdapter`.

Beide Wege übergeben das Original-PDF an den Systemdialog. Damit bleiben Text und Linien vektorbasiert und die Benutzer wählen Drucker, Seitenbereich und weitere Optionen im gewohnten Betriebssystemdialog.

Die Dateien werden beim späteren Erstellen der nativen Capacitor-Projekte in die jeweilige App übernommen und dort registriert. Version 0.10.0 konzentriert sich weiterhin auf die PWA; deshalb bleiben die in Version 0.6 vorbereiteten nativen Druckquellen unverändert erhalten und werden erst bei einer späteren Store-App kompiliert und auf realen Geräten geprüft.
