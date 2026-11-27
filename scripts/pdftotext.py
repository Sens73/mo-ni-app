#!/usr/bin/env python3
"""Ersatz für `pdftotext -layout DATEI -` ohne Zusatzprogramme (nutzt das mitgelieferte pypdf).

Die Archiv-Skripte brauchen nur den Text und die Seitenzahl (Seiten getrennt durch \\f).
So läuft der Abgleich auf dem Mac ohne Poppler/Homebrew und ohne Codex.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "Serverautomatisierung" / "arbeitsheft" / "vendor"))
from pypdf import PdfReader  # noqa: E402


def main(arguments):
    files = [argument for argument in arguments if not argument.startswith("-") or argument == "-"]
    if not files or files[0] == "-":
        print("Aufruf: pdftotext.py [-layout] DATEI -", file=sys.stderr)
        return 2
    reader = PdfReader(files[0])
    pages = []
    for page in reader.pages:
        # Fließtext statt Layout: liest sich für die Suche besser (Wörter bleiben getrennt).
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")
    # Wie pdftotext: Seiten mit Seitenvorschub getrennt, auch leere Seiten zählen mit.
    sys.stdout.write("".join(text + "\f" for text in pages))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
