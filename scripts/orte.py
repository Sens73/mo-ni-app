"""Orte außerhalb des Programms findet es über ihren Namen, nicht über einen Pfad (AGENTS.md, Grundsatz 2)."""
import unicodedata
from pathlib import Path

KEIN_FACHORDNER = {"Werkzeuge", "Skills", "Mentor", "Vorhaben", "node_modules"}


def work():
    return next(p for p in Path(__file__).resolve().parents if (p / "AGENTS.md").is_file())


def ordner(name, tiefe=7):
    """Ordner mit diesem Namen in den Fachordnern, der nächstliegende zuerst."""
    gesucht = unicodedata.normalize("NFC", name)
    ebene = [work()]
    for t in range(tiefe):
        naechste = []
        for ort in ebene:
            for e in sorted(ort.iterdir()):
                if not e.is_dir() or e.name.startswith(".") or (t == 0 and e.name in KEIN_FACHORDNER):
                    continue
                if unicodedata.normalize("NFC", e.name) == gesucht:
                    return e
                naechste.append(e)
        ebene = naechste
    raise FileNotFoundError(f"Ordner „{name}“ nicht gefunden.")
