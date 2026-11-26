// Rules and example images from the corresponding Sunday worksheet, page 1.
// Image crops and source hashes: docs/raetsel-beispielbilder-quellen.json.
// Crops share the source sheet's 200-dpi scale, even when one includes a piece bank.
const exampleWidths={sumdoku:[224,224],zahlenpfade:[228,227],zahlenkreuze:[424,424],polyominos:[410,255],differenzpyramiden:[222,222],'deka-dots':[300,300],kenken:[265,265]};
const example=(id,altPuzzle,altSolution)=>({
  puzzle:`assets/puzzles/${id}-example.png`,solution:`assets/puzzles/${id}-solution.png`,altPuzzle,altSolution,
  layout:['zahlenkreuze','polyominos'].includes(id)?'stack':'pair',
  puzzleWidth:exampleWidths[id][0],solutionWidth:exampleWidths[id][1]
});
export const sundayPresentation={
  kenken:{label:'KenKens',intro:{
    rulesHtml:'<p>Fülle jedes leere Kästchen mit einer Zahl. Dabei gelten drei Grundregeln:</p><ul><li><strong>Das Raster bestimmt die Zahlen:</strong> Im 4 × 4-Gitter verwendest du die Zahlen 1 bis 4, im 5 × 5-Gitter die Zahlen 1 bis 5 und im 8 × 8-Gitter die Zahlen 1 bis 8.</li><li><strong>Keine Dopplungen:</strong> In jeder Zeile und jeder Spalte muss jede dieser Zahlen genau einmal stehen.</li><li><strong>Die Blöcke ausrechnen:</strong> Die dicken Linien teilen das Gitter in Blöcke. Oben links stehen eine Zielzahl und ein Rechenzeichen (+, −, ×, ÷). Rechne mit allen Zahlen des Blocks und diesem Zeichen. Das Ergebnis muss die Zielzahl sein. Für die Rechnung darfst du die Reihenfolge der Zahlen frei wählen.</li></ul><p><strong>Zwei wichtige Tipps für den Start:</strong></p><ul><li><strong>Einzelblöcke:</strong> Besteht ein Block aus nur einem Kästchen, steht dort kein Rechenzeichen. Trage einfach die vorgegebene Zahl ein. Hier kannst du anfangen.</li><li><strong>Zahlen wiederholen:</strong> Innerhalb eines Blocks darf dieselbe Zahl mehrfach vorkommen – solange sie nicht doppelt in derselben Zeile oder Spalte steht.</li></ul>',
    example:example('kenken','KenKen-Beispiel vom Sonntagsblatt: ein 4-mal-4-Gitter mit Rechenblöcken und einer vorgegebenen 4.','Lösung desselben Beispiels: alle Zeilen und Spalten enthalten die Zahlen 1 bis 4; die Rechenblöcke stimmen.')
  }},
  'deka-dots':{label:'Deka Dots',cardImage:'assets/puzzles/deka-dots-card.svg?v=0.14.0-release-3',intro:{
    rulesHtml:"<p><strong>So geht’s:</strong> Schreibe in jedes leere Kästchen eine Ziffer von <strong>0 bis 9</strong>. Die Zahlen in allen Kästchen, die einen Punkt berühren, ergeben zusammen <strong>10</strong>. Kästchen, die eine Seite teilen, dürfen nicht dieselbe Ziffer enthalten.</p>",
    example:example('deka-dots','Deka-Dots-Beispiel vom Sonntagsblatt: oben links steht 6, im breiten Kästchen oben rechts 2. Darunter sind drei leere Kästchen. Zwei orangefarbene Punkte liegen auf der mittleren waagerechten Linie.','Lösung desselben Beispiels: unten stehen 2, 0 und 8. Am linken Punkt gilt 6 + 2 + 2 + 0 = 10, am rechten Punkt 2 + 0 + 8 = 10. Die ergänzten Ziffern sind grün.')
  }},
  sumdoku:{label:'Sumdoku',intro:{
    rulesHtml:'<p><strong>Das Ziel eines Sumdoku-Rätsels</strong> ist es, das Gitter mit den vorgegebenen Ziffern zu füllen. Dabei gelten diese Regeln:</p><ul><li>Jede Ziffer muss in jeder Zeile und jeder Spalte <strong>genau einmal</strong> vorkommen. Im 3 × 3-Rätsel verwendest du die Ziffern <strong>1 bis 3</strong>, im 4 × 4-Rätsel die Ziffern <strong>1 bis 4</strong>.</li><li>Die Zahlen in jedem dick umrandeten <strong>Käfig</strong> müssen zusammen die Summe ergeben, die oben im Käfig steht. Käfige ohne Zahl dürfen jede Summe haben.</li></ul>',
    example:example('sumdoku','Sumdoku-Beispiel vom Sonntagsblatt: ein 3-mal-3-Gitter mit Käfigsummen 1 und 3 in der ersten Zeile sowie 3 im unteren rechten Käfig.','Lösung desselben Sumdoku: Zeile 1 enthält 1, 3, 2; Zeile 2 enthält 2, 1, 3; Zeile 3 enthält 3, 2, 1. Die ergänzten Ziffern sind grün.')
  }},
  zahlenpfade:{label:'Zahlenpfad',intro:{
    rulesHtml:'<p><strong>Das Ziel von Zahlenpfad-Rätseln</strong> ist es, jedes Kästchen mit einer Zahl zu füllen. So entsteht ein Weg von <strong>1 bis zur größten Zahl</strong> des Rätsels: 1, 2, 3, 4, …</p><p>Der Weg von einer Zahl zur nächsten darf nur <strong>nach oben, unten, links oder rechts</strong> führen – <strong>niemals diagonal</strong>.</p>',
    example:example('zahlenpfade','Zahlenpfad-Beispiel vom Sonntagsblatt: ein 4-mal-4-Gitter mit den vorgegebenen Zahlen 1, 9, 12 und 16.','Lösung desselben Zahlenpfads: Zeilen 16, 9, 8, 7; 15, 10, 11, 6; 14, 13, 12, 5; 1, 2, 3, 4. Der Weg von 1 bis 16 ist grau markiert, ergänzte Zahlen sind grün.')
  }},
  zahlenkreuze:{label:'Zahlenkreuz',cardImage:'assets/puzzles/zahlenkreuze-card.svg?v=0.14.0-release-3',intro:{
    rulesHtml:'<p><strong>So funktionieren Zahlenkreuze:</strong> Fülle die leeren Kästchen mit Zahlen. In jeder Reihe und jeder Spalte aus Kästchen, die sich berühren, bilden die Zahlen eine Zahlenfolge. Von einem Kästchen zum nächsten zählst du dabei immer in gleich großen Schritten.</p><p><strong>Im Beispiel:</strong> 6 und 12 stehen nebeneinander. Hier zählst du in Sechserschritten weiter: 6, 12, 18, 24, 30. Das gilt auch von oben nach unten.</p>',
    example:example('zahlenkreuze','Zahlenkreuz-Beispiel vom Sonntagsblatt mit den Vorgaben 6, 12, 15 und 25. Ein grün gefülltes Feld unterbricht die Reihe.','Lösung desselben Zahlenkreuzes: obere waagerechte Reihe 6, 12, 18, 24, 30; untere Reihe 24, 22, 20, 18, 16; senkrechte Reihen 15, 18, 21, 24, 27 und 35, 30, 25, 20, 15. Das grün gefüllte Feld bleibt gesperrt.')
  }},
  polyominos:{label:'Polyomino',intro:{
    rulesHtml:"<p><strong>So geht’s:</strong> Bedecke die weißen Felder der Figuren lückenlos. Nutze dazu jedes Polyomino unter der jeweiligen Figur. Du darfst die Teile drehen und spiegeln.</p><p>Schaue dir dazu auch das Beispiel an.</p>",
    example:example('polyominos','Polyomino-Beispiel vom Sonntagsblatt: eine violette Figur mit weißen Feldern und fünf verschieden geformten farbigen Teilen darunter.','Lösung desselben Polyomino-Beispiels: alle weißen Felder sind lückenlos mit den fünf farbigen Teilen bedeckt.')
  }},
  differenzpyramiden:{label:'Differenzpyramide',cardImage:'assets/puzzles/differenzpyramiden-card.svg?v=0.14.0-release-3',intro:{
    rulesHtml:'<p><strong>So geht’s:</strong> Schau dir zwei Steine direkt nebeneinander an. Ziehe die kleinere Zahl von der größeren ab. Das Ergebnis ist der Abstand und kommt in den Stein darüber. Trage jede grüne Zahl bei <strong>Nutze</strong> genau einmal in einen freien Stein ein.</p>',
    example:example('differenzpyramiden','Differenzpyramiden-Beispiel vom Sonntagsblatt: Nutze 2, 5 und 9. Unten rechts steht 3; darüber stehen 4 und 6.','Lösung derselben Differenzpyramide: unterste Reihe 5, 9, 3; darüber 4, 6; oben 2. Die verwendeten Zahlen 2, 5 und 9 sind durchgestrichen.')
  }}
};
